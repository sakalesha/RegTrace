import pytest
from shared.schemas.task import TaskGenerationResult
from shared.services.llm import LLMService
from shared.prompts.task_generation_prompt import TASK_GENERATION_SYSTEM_PROMPT, TASK_GENERATION_HUMAN_PROMPT

@pytest.mark.asyncio
async def test_task_generation():
    result = await LLMService.generate_structured(
        system_prompt=TASK_GENERATION_SYSTEM_PROMPT,
        human_prompt=TASK_GENERATION_HUMAN_PROMPT,
        schema=TaskGenerationResult,
        input_vars={
            "title": "Maintain Audit Logs",
            "description": "The stock broker shall maintain all audit logs for a period of five years.",
            "actor": "Stock Broker",
            "action": "Maintain",
            "object": "Audit Logs",
            "deadline": "5 Years"
        }
    )
    
    assert len(result.tasks) >= 1
    task = result.tasks[0]
    
    # Should be actionable
    assert task.priority in ["HIGH", "MEDIUM", "LOW"]
    assert len(task.title) > 5
