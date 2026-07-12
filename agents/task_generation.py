import uuid
import asyncio
from shared.database.mongodb import get_db
from shared.schemas.pipeline import ExecutionContext
from shared.schemas.task import TaskGenerationResult
from agents.base import BaseAgent
from shared.services.llm import LLMService
from shared.prompts.task_generation_prompt import TASK_GENERATION_SYSTEM_PROMPT, TASK_GENERATION_HUMAN_PROMPT
from shared.services.logger import Logger

class TaskGenerationAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("TaskGenerationAgent", f"Started for {document_id}")
        db = get_db()
        
        # 1. Fetch validated obligations
        obligations = await db.obligations.find({"document_id": document_id, "status": "VALIDATED"}).to_list(length=None)
        
        if not obligations:
            Logger.warning("TaskGenerationAgent", f"No validated obligations found for {document_id}")
            return context
            
        Logger.info("TaskGenerationAgent", f"Generating tasks for {len(obligations)} obligations...")
        
        all_tasks = []
        
        async def process_obligation(ob):
            try:
                result = await LLMService.generate_structured(
                    system_prompt=TASK_GENERATION_SYSTEM_PROMPT,
                    human_prompt=TASK_GENERATION_HUMAN_PROMPT,
                    schema=TaskGenerationResult,
                    input_vars={
                        "title": ob.get("title", ""),
                        "description": ob.get("description", ""),
                        "actor": ob.get("actor", ""),
                        "action": ob.get("action", ""),
                        "object": ob.get("object", ""),
                        "deadline": ob.get("deadline", "")
                    }
                )
                
                tasks = []
                for t in result.tasks:
                    doc = t.model_dump()
                    doc["task_id"] = f"TSK-{uuid.uuid4().hex[:8].upper()}"
                    doc["document_id"] = document_id
                    doc["obligation_id"] = ob["obligation_id"]
                    doc["status"] = "PENDING_ASSIGNMENT"
                    tasks.append(doc)
                return tasks
            except Exception as e:
                Logger.error("TaskGenerationAgent", f"Failed to generate tasks for obligation {ob.get('obligation_id')}", exc=e)
                return []

        results = await asyncio.gather(*[process_obligation(ob) for ob in obligations])
        
        for r_list in results:
            all_tasks.extend(r_list)
            
        if not all_tasks:
            Logger.warning("TaskGenerationAgent", "No tasks generated.")
            return context
            
        # 4. Store in MongoDB
        await db.compliance_tasks.insert_many(all_tasks)
        
        Logger.info("TaskGenerationAgent", f"Finished for {document_id}. Created {len(all_tasks)} actionable tasks.")
        
        return context
