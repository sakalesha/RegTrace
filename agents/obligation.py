import uuid
import asyncio
from shared.database.mongodb import get_db
from shared.schemas.obligation import ObligationExtractionResult
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.llm import LLMService
from shared.prompts.obligation_prompt import OBLIGATION_SYSTEM_PROMPT, OBLIGATION_HUMAN_PROMPT
from shared.services.logger import Logger

class ObligationExtractionAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("ObligationExtractionAgent", f"Started for {document_id}")
        db = get_db()
        
        # 1. Fetch Embedded Chunks
        chunks = await db.document_chunks.find({"document_id": document_id, "status": "EMBEDDED"}).to_list(length=None)
        
        if not chunks:
            Logger.warning("ObligationExtractionAgent", f"No chunks found for obligation extraction for {document_id}")
            return context
            
        Logger.info("ObligationExtractionAgent", f"Extracting obligations from {len(chunks)} chunks using LLM Service...")
        
        all_pending_obligations = []
        
        async def process_chunk(chunk):
            try:
                result = await LLMService.generate_structured(
                    system_prompt=OBLIGATION_SYSTEM_PROMPT,
                    human_prompt=OBLIGATION_HUMAN_PROMPT,
                    schema=ObligationExtractionResult,
                    input_vars={
                        "page": chunk.get("page", "Unknown"),
                        "heading": chunk.get("heading", "Unknown"),
                        "section": chunk.get("section", "Unknown"),
                        "text": chunk["text"]
                    }
                )
                
                extracted = []
                for ob in result.obligations:
                    doc = ob.model_dump()
                    doc["obligation_id"] = f"OBL-{uuid.uuid4().hex[:8].upper()}"
                    doc["document_id"] = document_id
                    doc["chunk_id"] = chunk["chunk_id"]
                    doc["page_number"] = chunk.get("page")
                    doc["heading"] = chunk.get("heading")
                    doc["section"] = chunk.get("section")
                    doc["status"] = "PENDING_VALIDATION"
                    extracted.append(doc)
                return extracted
            except Exception as e:
                Logger.error("ObligationExtractionAgent", f"Failed to extract obligations from chunk {chunk['chunk_id']}", exc=e)
                return []
                
        # 3. Analyze each chunk concurrently
        results = await asyncio.gather(*[process_chunk(chunk) for chunk in chunks])
        
        for r_list in results:
            all_pending_obligations.extend(r_list)
            
        if not all_pending_obligations:
            Logger.warning("ObligationExtractionAgent", "No obligations extracted.")
            return context
            
        # 4. Store in MongoDB
        await db.obligations.insert_many(all_pending_obligations)
        
        # 5. Update Document Status
        await db.raw_documents.update_one(
            {"document_id": document_id},
            {"$set": {"status": "OBLIGATIONS_EXTRACTED"}}
        )
        
        Logger.info("ObligationExtractionAgent", f"Finished for {document_id}. Found {len(all_pending_obligations)} pending obligations.")
        
        return context
