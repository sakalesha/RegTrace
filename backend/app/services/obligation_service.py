import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.db.mongodb import db
from app.agents.obligation_extraction_agent import ObligationExtractionAgent
from app.models.obligation import ObligationModel
from app.schemas.document import DocumentStatus
from app.services.job_registry import registry
from app.utils.pipeline_log import get_stage_logger, stage_start, stage_done, stage_fail

logger = get_stage_logger("extract")

def _is_degenerate_clause(text: str) -> bool:
    """True for clauses too short or that are bare list lead-ins (e.g. ending with ':')."""
    return len(text.split()) < 10 or text.rstrip().endswith(":")

class ObligationService:
    def __init__(self):
        self.agent = ObligationExtractionAgent()

    def _is_valid_obligation(self, ob) -> bool:
        """Drop degenerate extractions: empty actor/action or bare single-verb actions."""
        actor = (ob.actor or "").strip()
        action = (ob.action or "").strip()
        if not actor or not action:
            return False
        if len(action.split()) < 2:
            return False
        return True

    async def get_obligations(self, filters: Dict[str, Any]) -> List[ObligationModel]:
        database = db.get_db()
        cursor = database.obligations.find(filters).sort("confidence_score", 1) # Lowest confidence first
        obligations = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            obligations.append(ObligationModel(**doc))
        return obligations

    async def review_obligation(self, obligation_id: str, status: str, updated_data: dict = None, reviewer: str = None, comment: str = None) -> Optional[ObligationModel]:
        database = db.get_db()
        oid = ObjectId(obligation_id)
        previous = await database.obligations.find_one({"_id": oid})
        if not previous:
            return None

        update_doc = {"status": status}
        if updated_data:
            # allow updating fields like description, timeline, etc.
            update_doc.update(updated_data)
        # reviewer/comment are review metadata, not obligation fields
        update_doc.pop("reviewer", None)
        update_doc.pop("comment", None)
        update_doc.pop("review_id", None)
        update_doc.pop("_id", None)

        await database.obligations.update_one(
            {"_id": oid},
            {"$set": update_doc}
        )

        updated_obs = await database.obligations.find_one({"_id": oid})
        updated_obs["_id"] = str(updated_obs["_id"])

        action = "EDIT"
        if status == "APPROVED":
            action = "APPROVE"
        elif status == "REJECTED":
            action = "REJECT"

        previous_snapshot = {k: previous.get(k) for k in update_doc.keys()}
        changes = {k: v for k, v in update_doc.items() if k != "status"}

        await database.reviews.insert_one({
            "review_id": str(ObjectId()),
            "obligation_id": obligation_id,
            "document_id": updated_obs.get("document_id"),
            "clause_id": updated_obs.get("clause_id"),
            "action": action,
            "reviewer": reviewer,
            "comment": comment,
            "previous": previous_snapshot,
            "changes": changes,
            "created_at": datetime.utcnow(),
        })

        await self._maybe_mark_reviewed(database, updated_obs.get("document_id"))

        from app.services.audit_service import log_event
        await log_event(
            "OBLIGATION_REVIEWED",
            document_id=updated_obs.get("document_id"),
            actor=reviewer,
            meta={"obligation_id": obligation_id, "action": action, "status": status},
        )
        return ObligationModel(**updated_obs)

    async def _maybe_mark_reviewed(self, database, document_id: str):
        """Transition a document to OBLIGATIONS_REVIEWED once it has no PENDING obligations."""
        if not document_id:
            return
        remaining = await database.obligations.count_documents(
            {"document_id": document_id, "status": "PENDING"}
        )
        if remaining == 0:
            await database.documents.update_one(
                {"document_id": document_id},
                {"$set": {"processing_status": DocumentStatus.OBLIGATIONS_REVIEWED}}
            )
            from app.services.audit_service import log_event
            await log_event("DOCUMENT_OBLIGATIONS_REVIEWED", document_id=document_id)

    async def get_reviews(self, obligation_id: str) -> List[dict]:
        database = db.get_db()
        cursor = database.reviews.find({"obligation_id": obligation_id}).sort("created_at", -1)
        out = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            out.append(doc)
        return out

    async def bulk_approve(self, obligation_ids: List[str]) -> int:
        database = db.get_db()
        object_ids = [ObjectId(oid) for oid in obligation_ids]
        affected = await database.obligations.find(
            {"_id": {"$in": object_ids}}, {"document_id": 1, "clause_id": 1, "status": 1}
        ).to_list(length=None)
        doc_ids = list({a["document_id"] for a in affected})

        result = await database.obligations.update_many(
            {"_id": {"$in": object_ids}},
            {"$set": {"status": "APPROVED"}}
        )

        now = datetime.utcnow()
        review_docs = []
        for a in affected:
            review_docs.append({
                "review_id": str(ObjectId()),
                "obligation_id": str(a["_id"]),
                "document_id": a.get("document_id"),
                "clause_id": a.get("clause_id"),
                "action": "APPROVE",
                "reviewer": None,
                "comment": None,
                "previous": {"status": a.get("status")},
                "changes": {"status": "APPROVED"},
                "created_at": now,
            })
        if review_docs:
            await database.reviews.insert_many(review_docs)

        for doc_id in doc_ids:
            await self._maybe_mark_reviewed(database, doc_id)

        from app.services.audit_service import log_event
        await log_event(
            "OBLIGATIONS_BULK_APPROVED",
            meta={"document_ids": doc_ids, "count": len(obligation_ids)},
        )
        return result.modified_count

    async def process_document_obligations(self, document_id: str):
        """
        Background job to extract obligations for all clauses in a document.
        Idempotent: clears existing PENDING obligations for this document before starting.
        """
        database = db.get_db()
        cancel_event = registry.register(document_id)
        start_time = stage_start(logger, "obligation-extraction", document_id)
        
        # 1. Clear existing obligations for this document (extraction is idempotent).
        await database.obligations.delete_many({"document_id": document_id})
        
        # 2. Set document status
        await database.documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "processing_status": DocumentStatus.EXTRACTING_OBLIGATIONS,
                "cancel_requested": False,
                "job_started_at": datetime.utcnow().isoformat(),
                "clauses_processed": 0,
            }}
        )
        from app.services.audit_service import log_event
        await log_event("OBLIGATION_EXTRACTION_STARTED", document_id=document_id)
        
        try:
            # 3. Fetch only clauses flagged as having obligations
            cursor = database.clauses.find({"document_id": document_id, "has_obligations": True})
            clauses = await cursor.to_list(length=None)
            logger.info("Loaded %d obligation-bearing clauses", len(clauses))

            # Group clauses into batches so a single LLM call processes several
            # clauses. This cuts request count (and therefore rate-limit pressure)
            # while keeping output JSON small enough to avoid truncation.
            # BATCH_SIZE=3 + ~25s pacing keeps each call inside Groq's
            # 6000-token/minute window (large calls would 429 once the window fills).
            BATCH_SIZE = 3
            batches = [
                clauses[i:i + BATCH_SIZE]
                for i in range(0, len(clauses), BATCH_SIZE)
            ]
            logger.info("Split into %d batches of up to %d clauses", len(batches), BATCH_SIZE)

            # 4. Batch process with limited concurrency to respect LLM rate limits
            sem = asyncio.Semaphore(1) # STRICT GROQ RATE LIMIT: max 1 concurrent request
            done_batches = 0
            total_obligations = 0

            async def process_batch(batch):
                nonlocal done_batches, total_obligations
                if cancel_event.is_set():
                    return
                async with sem:
                    if cancel_event.is_set():
                        return
                    if await database.documents.find_one(
                        {"document_id": document_id, "cancel_requested": True}, {"_id": 1}
                    ):
                        return

                    payload = [
                        {"clause_id": c["clause_id"], "text": c.get("text", "")}
                        for c in batch
                        if not _is_degenerate_clause(c.get("text", ""))
                    ]
                    if not payload:
                        done_batches += 1
                        return
                    try:
                        batch_ids = [c["clause_id"] for c in payload]
                        logger.info("Calling LLM on batch %d/%d | clauses: %s",
                                    done_batches + 1, len(batches), batch_ids)
                        results = await self.agent.run_batch(payload)
                        obs_to_insert = []
                        clauses_with_obs = 0
                        for clause in batch:
                            clause_id = clause["clause_id"]
                            extracted = results.get(clause_id)
                            if not extracted:
                                continue
                            for ob in extracted.obligations:
                                if not self._is_valid_obligation(ob):
                                    continue
                                obs_to_insert.append(ObligationModel(
                                    _id=str(ObjectId()),
                                    document_id=document_id,
                                    clause_id=clause_id,
                                    actor=ob.actor,
                                    action=ob.action,
                                    condition=ob.condition,
                                    deadline=ob.deadline,
                                    frequency=ob.frequency,
                                    is_mandatory=ob.is_mandatory,
                                    confidence_score=ob.confidence_score,
                                    status="APPROVED"
                                ).model_dump(by_alias=True))
                            if extracted.obligations:
                                clauses_with_obs += 1

                        # Insert incrementally so partial results are persisted
                        # immediately and the frontend live counter reflects
                        # real progress as batches are processed.
                        if obs_to_insert:
                            for ob in obs_to_insert:
                                ob["_id"] = ObjectId(ob["_id"])
                            await database.obligations.insert_many(obs_to_insert)

                        total_obligations += len(obs_to_insert)

                        # Track how many clauses have been processed so the
                        # frontend can show "X of N clauses completed".
                        await database.documents.update_one(
                            {"document_id": document_id},
                            {"$inc": {"clauses_processed": len(batch)}}
                        )

                        done_batches += 1
                        logger.info(
                            "Batch %d/%d complete | %d/%d clauses | %d obligations extracted (cumulative %d)",
                            done_batches, len(batches), len(batch), len(payload),
                            len(obs_to_insert), total_obligations,
                        )

                        await asyncio.sleep(15) # STRICT GROQ RATE LIMIT: pace calls into fresh token windows (12K TPM model)
                    except Exception as e:
                        done_batches += 1
                        logger.exception("Failed to extract obligations for clause batch %s",
                                         [c['clause_id'] for c in batch])

            # Run all batches concurrently with semaphore limit
            tasks = [process_batch(batch) for batch in batches]
            await asyncio.gather(*tasks)
            
            if cancel_event.is_set():
                logger.info("Obligation extraction cancelled for document %s", document_id)
                await database.obligations.delete_many({"document_id": document_id})
                await database.documents.update_one(
                    {"document_id": document_id},
                    {"$set": {"processing_status": DocumentStatus.PROCESSING_CANCELLED}}
                )
                from app.services.audit_service import log_event
                await log_event("OBLIGATION_EXTRACTION_CANCELLED", document_id=document_id)
                return
            
            # 5. Set document status to ready
            await database.documents.update_one(
                {"document_id": document_id},
                {"$set": {"processing_status": DocumentStatus.OBLIGATIONS_EXTRACTED}}
            )
            from app.services.audit_service import log_event
            await log_event(
                "OBLIGATIONS_EXTRACTED",
                document_id=document_id,
                meta={"obligations": total_obligations, "clauses": len(clauses)},
            )
            stage_done(logger, "obligation-extraction", document_id,
                       f"{total_obligations} obligations from {len(clauses)} clauses",
                       start=start_time)

            # 6. Auto-trigger task generation in the background once extraction
            #    succeeds. The obligations are auto-approved (status="APPROVED"),
            #    so task generation can consume them immediately.
            from app.services.task_service import TaskService
            asyncio.create_task(TaskService().process_document_tasks(document_id))

            # 6b. Best-effort embeddings for semantic search (clauses + obligations).
            try:
                from app.services.embedding_service import embed_document
                asyncio.create_task(embed_document(document_id))
            except Exception as e:
                logger.warning("Obligation embedding skipped: %s", e)
            
        except Exception as e:
            stage_fail(logger, "obligation-extraction", document_id, e)
            await database.documents.update_one(
                {"document_id": document_id},
                {"$set": {"processing_status": DocumentStatus.EXTRACTION_FAILED}}
            )
            from app.services.audit_service import log_event
            await log_event("OBLIGATION_EXTRACTION_FAILED", document_id=document_id, meta={"error": str(e)})
        finally:
            registry.clear(document_id)
            await database.documents.update_one(
                {"document_id": document_id},
                {"$unset": {"cancel_requested": ""}}
            )
