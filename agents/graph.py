from shared.database.mongodb import get_db
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger
from repositories.graph_repository import GraphRepository

class KnowledgeGraphAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("KnowledgeGraphAgent", f"Started for {document_id}")
        db = get_db()
        
        try:
            # 1. Document
            raw_doc = await db.raw_documents.find_one({"document_id": document_id})
            if raw_doc:
                GraphRepository.create_document(document_id, raw_doc.get("title", "Unknown"))
                
            # 2. Chunks
            chunks = await db.document_chunks.find({"document_id": document_id}).to_list(length=None)
            for c in chunks:
                GraphRepository.create_chunk(
                    chunk_id=c["chunk_id"],
                    document_id=document_id,
                    page=c.get("page", 0) or 0,
                    heading=c.get("heading", ""),
                    section=c.get("section", "")
                )
                
            # 3. Obligations
            obligations = await db.obligations.find({"document_id": document_id, "status": "VALIDATED"}).to_list(length=None)
            for o in obligations:
                GraphRepository.create_obligation(
                    obligation_id=o["obligation_id"],
                    chunk_id=o["chunk_id"],
                    title=o.get("title", ""),
                    actor=o.get("actor", ""),
                    action=o.get("action", "")
                )
                
            # 4. Tasks (now running after TaskAssignmentAgent)
            tasks = await db.compliance_tasks.find({"document_id": document_id}).to_list(length=None)
            for t in tasks:
                GraphRepository.create_task(
                    task_id=t["task_id"],
                    obligation_id=t["obligation_id"],
                    title=t.get("title", ""),
                    owner=t.get("owner", "Unassigned"),
                    department=t.get("department", "General"),
                    dependencies=t.get("dependencies", [])
                )
                
            Logger.info("KnowledgeGraphAgent", f"Finished for {document_id}. Populated Neo4j Graph.")
            
        except Exception as e:
            Logger.error("KnowledgeGraphAgent", "Failed to construct Knowledge Graph", exc=e)
            
        return context
