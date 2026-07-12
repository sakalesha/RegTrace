import uuid
import asyncio
from shared.database.mongodb import get_db
from shared.schemas.pipeline import ExecutionContext
from shared.schemas.obligation import ObligationExtractionResult
from agents.base import BaseAgent
from shared.services.llm import LLMService
from shared.prompts.validation_prompt import VALIDATION_SYSTEM_PROMPT, VALIDATION_HUMAN_PROMPT
from shared.services.logger import Logger

class ValidationAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("ValidationAgent", f"Started for {document_id}")
        db = get_db()
        
        # 1. Fetch chunks and pending obligations
        chunks = await db.document_chunks.find({"document_id": document_id}).to_list(length=None)
        chunk_dict = {c["chunk_id"]: c for c in chunks}
        
        pending_obs = await db.obligations.find({"document_id": document_id, "status": "PENDING_VALIDATION"}).to_list(length=None)
        
        if not pending_obs:
            Logger.warning("ValidationAgent", f"No pending obligations found for {document_id}")
            return context
            
        Logger.info("ValidationAgent", f"Validating {len(pending_obs)} obligations...")
        
        # Group by chunk
        obs_by_chunk = {}
        for ob in pending_obs:
            cid = ob.get("chunk_id")
            if cid not in obs_by_chunk:
                obs_by_chunk[cid] = []
            obs_by_chunk[cid].append(ob)
            
        validated_obligations = []
        
        async def validate_chunk_obligations(chunk_id, obligations):
            chunk = chunk_dict.get(chunk_id)
            if not chunk:
                return []
                
            try:
                # Strip MongoDB specific _id and status for prompt cleaniness
                clean_obs = [{k:v for k,v in ob.items() if k not in ["_id", "status"]} for ob in obligations]
                
                result = await LLMService.generate_structured(
                    system_prompt=VALIDATION_SYSTEM_PROMPT,
                    human_prompt=VALIDATION_HUMAN_PROMPT,
                    schema=ObligationExtractionResult,
                    input_vars={
                        "text": chunk["text"],
                        "extracted_obligations": str(clean_obs)
                    }
                )
                
                valid = []
                for val_ob in result.obligations:
                    # Restore metadata
                    val_doc = val_ob.model_dump()
                    val_doc["obligation_id"] = f"VAL-{uuid.uuid4().hex[:8].upper()}"
                    val_doc["document_id"] = document_id
                    val_doc["chunk_id"] = chunk_id
                    val_doc["page_number"] = chunk.get("page")
                    val_doc["heading"] = chunk.get("heading")
                    val_doc["section"] = chunk.get("section")
                    val_doc["status"] = "VALIDATED"
                    valid.append(val_doc)
                    
                return valid
            except Exception as e:
                Logger.error("ValidationAgent", f"Validation failed for chunk {chunk_id}", exc=e)
                # Fallback: drop them to be safe, or pass them through. We will drop them to prevent hallucination.
                return []

        # Process concurrently
        tasks = [validate_chunk_obligations(cid, obs) for cid, obs in obs_by_chunk.items()]
        results = await asyncio.gather(*tasks)
        
        for r in results:
            validated_obligations.extend(r)
            
        # 3. Store validated and remove pending
        await db.obligations.delete_many({"document_id": document_id, "status": "PENDING_VALIDATION"})
        
        if validated_obligations:
            await db.obligations.insert_many(validated_obligations)
            Logger.info("ValidationAgent", f"Approved {len(validated_obligations)} out of {len(pending_obs)} obligations.")
        else:
            Logger.warning("ValidationAgent", "All obligations were rejected by the validator.")
            
        return context
