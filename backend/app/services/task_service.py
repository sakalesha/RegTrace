import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.db.mongodb import db
from app.agents.task_generation_agent import TaskGenerationAgent
from app.agents.task_assignment_agent import TaskAssignmentAgent
from app.models.task import TaskModel
from app.schemas.document import DocumentStatus
from app.schemas.task import TaskStatus, TaskUpdate, Department
from app.services.job_registry import registry
from app.utils.pipeline_log import get_stage_logger, stage_start, stage_done, stage_fail

logger = get_stage_logger("tasks")


class TaskService:
    def __init__(self):
        self.generation_agent = TaskGenerationAgent()
        self.assignment_agent = TaskAssignmentAgent()

    async def get_tasks(self, filters: Dict[str, Any]) -> List[TaskModel]:
        database = db.get_db()
        cursor = database.tasks.find(filters).sort("created_at", -1)
        tasks = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            tasks.append(TaskModel(**doc))
        return tasks

    async def get_task(self, task_id: str) -> Optional[TaskModel]:
        database = db.get_db()
        doc = await database.tasks.find_one({"_id": ObjectId(task_id)})
        if not doc:
            return None
        doc["_id"] = str(doc["_id"])
        return TaskModel(**doc)

    async def update_task(self, task_id: str, update_data: TaskUpdate) -> Optional[TaskModel]:
        database = db.get_db()
        updates = update_data.model_dump(exclude_unset=True, mode="json")

        # Moving out of the unassigned state when a department is chosen.
        if updates.get("assigned_department") and not updates.get("status"):
            existing = await database.tasks.find_one({"_id": ObjectId(task_id)})
            if existing and existing.get("status") == TaskStatus.PENDING_ASSIGNMENT.value:
                updates["status"] = TaskStatus.ASSIGNED.value

        if not updates:
            return await self.get_task(task_id)

        updates["updated_at"] = datetime.utcnow()
        await database.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": updates}
        )
        return await self.get_task(task_id)

    async def assign_task(self, task_id: str, department: Department) -> Optional[TaskModel]:
        database = db.get_db()
        await database.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "assigned_department": department,
                    "status": TaskStatus.ASSIGNED.value,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        return await self.get_task(task_id)

    async def process_document_tasks(self, document_id: str):
        """
        Background job that converts all APPROVED obligations of a document into
        assigned compliance tasks. Idempotent: clears existing tasks for the
        document before starting.
        """
        database = db.get_db()
        cancel_event = registry.register(document_id)
        start_time = stage_start(logger, "task-generation", document_id)

        # 1. Clear existing tasks for this document.
        await database.tasks.delete_many({"document_id": document_id})

        # 2. Set document status.
        await database.documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "processing_status": DocumentStatus.GENERATING_TASKS,
                "cancel_requested": False,
                "tasks_processed": 0,
            }}
        )

        try:
            # 3. Fetch only approved obligations.
            cursor = database.obligations.find({"document_id": document_id, "status": "APPROVED"})
            obligations = await cursor.to_list(length=None)
            if not obligations:
                logger.info(f"No approved obligations to generate tasks for document {document_id}")
                await database.documents.update_one(
                    {"document_id": document_id},
                    {"$set": {"processing_status": DocumentStatus.TASKS_ASSIGNED}}
                )
                return

            # 4. Build clause lookup to backfill clause references and page numbers.
            clause_map = {}
            clauses_cursor = database.clauses.find({"document_id": document_id})
            async for clause in clauses_cursor:
                clause_map[clause["clause_id"]] = clause
            logger.info("Loaded %d approved obligations and %d clauses",
                        len(obligations), len(clause_map))

            # 5. Group obligations into batches so a single LLM call generates tasks
            #    for several obligations at once (cuts request count and rate-limit
            #    pressure). Track tasks_processed so the frontend can show "X of N
            #    obligations" progress.
            BATCH_SIZE = 3
            batches = [
                obligations[i:i + BATCH_SIZE]
                for i in range(0, len(obligations), BATCH_SIZE)
            ]
            logger.info("Split %d approved obligations into %d batches of up to %d",
                        len(obligations), len(batches), BATCH_SIZE)

            # 6. Batch process with limited concurrency to respect LLM rate limits.
            sem = asyncio.Semaphore(1)  # STRICT GROQ RATE LIMIT: max 1 concurrent request
            done_batches = 0
            total_tasks = 0

            async def process_batch(batch) -> List[TaskModel]:
                nonlocal done_batches, total_tasks
                if cancel_event.is_set():
                    return []
                async with sem:
                    if cancel_event.is_set():
                        return []
                    if await database.documents.find_one(
                        {"document_id": document_id, "cancel_requested": True}, {"_id": 1}
                    ):
                        return []
                    try:
                        payload = []
                        for ob in batch:
                            obligation_data = dict(ob)
                            obligation_data["_id"] = str(obligation_data["_id"])
                            payload.append({
                                "obligation_id": obligation_data["_id"],
                                "actor": ob.get("actor"),
                                "action": ob.get("action"),
                                "condition": ob.get("condition"),
                                "deadline": ob.get("deadline"),
                                "frequency": ob.get("frequency"),
                                "is_mandatory": ob.get("is_mandatory"),
                            })

                        batch_ids = [p["obligation_id"] for p in payload]
                        logger.info("Calling LLM on obligation batch %d/%d | ids: %s",
                                    done_batches + 1, len(batches), batch_ids)
                        results = await self.generation_agent.run_batch(payload)

                        task_models: List[TaskModel] = []
                        for ob in batch:
                            obligation_data = dict(ob)
                            obligation_id = str(obligation_data["_id"])
                            generated = results.get(obligation_id)
                            if not generated:
                                continue
                            for task in generated.tasks:
                                # 6a. Deterministic assignment.
                                assigned = await self.assignment_agent.run({
                                    "title": task.title,
                                    "description": task.description,
                                    "category": task.category,
                                })

                                clause = clause_map.get(ob["clause_id"]) if ob.get("clause_id") else None
                                clause_reference = task.clause_reference
                                page_number = task.page_number
                                if clause:
                                    if not clause_reference:
                                        clause_reference = clause.get("section_number") or clause.get("title") or clause.get("heading")
                                    if not page_number:
                                        page_number = clause.get("page_number")

                                task_models.append(TaskModel(
                                    _id=str(ObjectId()),
                                    document_id=document_id,
                                    obligation_id=obligation_id,
                                    clause_id=ob.get("clause_id"),
                                    title=task.title,
                                    description=task.description,
                                    category=task.category,
                                    priority=task.priority,
                                    due_rule=task.due_rule,
                                    recurrence=task.recurrence,
                                    evidence_required=task.evidence_required,
                                    clause_reference=clause_reference,
                                    page_number=page_number,
                                    recommended_owner=task.recommended_owner,
                                    assigned_department=assigned,
                                    status=TaskStatus.ASSIGNED,
                                ))
                        done_batches += 1
                        total_tasks += len(task_models)

                        # Persist incrementally so partial results survive crashes
                        # and the frontend live counter reflects real progress.
                        if task_models:
                            task_dicts = [t.model_dump(by_alias=True) for t in task_models]
                            for t in task_dicts:
                                t["_id"] = ObjectId(t["_id"])
                            await database.tasks.insert_many(task_dicts)

                        # Track how many obligations have been processed for progress.
                        await database.documents.update_one(
                            {"document_id": document_id},
                            {"$inc": {"tasks_processed": len(batch)}}
                        )

                        logger.info("Obligation batch %d/%d complete | %d obligations | %d tasks (cumulative %d)",
                                    done_batches, len(batches), len(batch), len(task_models), total_tasks)
                        await asyncio.sleep(15)  # STRICT GROQ RATE LIMIT: pace calls into fresh token windows (12K TPM model)
                        return task_models
                    except Exception as e:
                        done_batches += 1
                        logger.exception("Failed to generate tasks for obligation batch %s",
                                         [ob.get('_id') for ob in batch])
                        return []

            tasks = [process_batch(batch) for batch in batches]
            results = await asyncio.gather(*tasks)

            if cancel_event.is_set():
                logger.info("Task generation cancelled for document %s", document_id)
                await database.documents.update_one(
                    {"document_id": document_id},
                    {"$set": {"processing_status": DocumentStatus.PROCESSING_CANCELLED}}
                )
                return

            all_tasks = []
            for res in results:
                all_tasks.extend(res)

            # 7. Set document status to ready.
            await database.documents.update_one(
                {"document_id": document_id},
                {"$set": {"processing_status": DocumentStatus.TASKS_ASSIGNED}}
            )
            stage_done(logger, "task-generation", document_id,
                       f"{total_tasks} tasks from {len(obligations)} obligations",
                       start=start_time)

        except Exception as e:
            stage_fail(logger, "task-generation", document_id, e)
            await database.documents.update_one(
                {"document_id": document_id},
                {"$set": {"processing_status": DocumentStatus.TASKS_GENERATION_FAILED}}
            )
        finally:
            registry.clear(document_id)
            await database.documents.update_one(
                {"document_id": document_id},
                {"$unset": {"cancel_requested": ""}}
            )