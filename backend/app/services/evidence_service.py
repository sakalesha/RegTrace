import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId

from app.db.mongodb import db
from app.agents.evidence_collection_agent import EvidenceCollectionAgent
from app.models.evidence import EvidenceModel
from app.schemas.document import DocumentStatus
from app.schemas.evidence import EvidenceCreate, EvidenceStatus, EvidenceUpdate
from app.schemas.task import TaskStatus

logger = logging.getLogger("pipeline.evidence")


class EvidenceService:
    def __init__(self):
        self.agent = EvidenceCollectionAgent()

    async def get_evidence(self, evidence_id: str) -> Optional[EvidenceModel]:
        database = db.get_db()
        doc = await database.evidence.find_one({"_id": ObjectId(evidence_id)})
        if not doc:
            return None
        doc["_id"] = str(doc["_id"])
        return EvidenceModel(**doc)

    async def get_evidence_by_task(self, task_id: str) -> List[EvidenceModel]:
        database = db.get_db()
        cursor = database.evidence.find({"task_id": task_id}).sort("submitted_at", -1)
        records = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            records.append(EvidenceModel(**doc))
        return records

    async def get_evidence_by_document(self, document_id: str) -> List[EvidenceModel]:
        database = db.get_db()
        cursor = database.evidence.find({"document_id": document_id}).sort("submitted_at", -1)
        records = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            records.append(EvidenceModel(**doc))
        return records

    async def submit_evidence(
        self,
        *,
        task_id: str,
        file_name: str,
        content: bytes,
        document_id: str,
        obligation_id: str,
        description: Optional[str] = None,
        submitted_by: Optional[str] = None,
    ) -> EvidenceModel:
        """
        Validate, store, and persist a single evidence submission. On the first
        evidence captured for a document, transitions the document processing
        status to EVIDENCE_SUBMITTED.
        """
        database = db.get_db()

        # Resolve the task to backfill clause/page references.
        task = await database.tasks.find_one({"_id": ObjectId(task_id)})
        if not task:
            raise ValueError("Task not found")

        # Validate file shape before touching storage.
        self.agent._validate_file(file_name, content)
        file_url = self.agent.store_file(file_name, content)

        create = EvidenceCreate(
            task_id=task_id,
            document_id=document_id,
            obligation_id=obligation_id,
            file_name=file_name,
            file_type=file_name.rsplit(".", 1)[-1].lower() if "." in file_name else None,
            file_url=file_url,
            file_size=len(content),
            description=description,
            submitted_by=submitted_by,
        )
        await self.agent.validate(create)
        await self.agent.process(create)
        await self.agent.validate_output(create)

        clause_reference = task.get("clause_reference")
        page_number = task.get("page_number")

        record = EvidenceModel(
            _id=str(ObjectId()),
            task_id=task_id,
            document_id=document_id,
            obligation_id=obligation_id,
            file_name=create.file_name,
            file_type=create.file_type,
            file_url=create.file_url,
            file_size=create.file_size,
            description=create.description,
            submitted_by=create.submitted_by,
            status=EvidenceStatus.SUBMITTED,
            clause_reference=clause_reference,
            page_number=page_number,
        )
        doc_dict = record.model_dump(by_alias=True)
        doc_dict["_id"] = ObjectId(record.id)
        await database.evidence.insert_one(doc_dict)

        # Mark the linked task as in-progress/having evidence if it is still open.
        if task.get("status") in {TaskStatus.ASSIGNED.value, TaskStatus.IN_PROGRESS.value}:
            await database.tasks.update_one(
                {"_id": ObjectId(task_id)},
                {"$set": {"status": TaskStatus.IN_PROGRESS.value, "updated_at": datetime.utcnow()}}
            )

        # First evidence for this document flips its processing status.
        count = await database.evidence.count_documents({"document_id": document_id})
        if count == 1:
            await database.documents.update_one(
                {"document_id": document_id},
                {"$set": {"processing_status": DocumentStatus.EVIDENCE_SUBMITTED}}
            )
            logger.info("Document %s transitioned to EVIDENCE_SUBMITTED (first evidence)", document_id)

        await self.agent.persist(create)
        return record

    async def update_evidence(self, evidence_id: str, update_data: EvidenceUpdate) -> Optional[EvidenceModel]:
        database = db.get_db()
        updates = update_data.model_dump(exclude_unset=True, mode="json")
        if not updates:
            return await self.get_evidence(evidence_id)
        updates["updated_at"] = datetime.utcnow()
        await database.evidence.update_one(
            {"_id": ObjectId(evidence_id)},
            {"$set": updates}
        )
        return await self.get_evidence(evidence_id)
