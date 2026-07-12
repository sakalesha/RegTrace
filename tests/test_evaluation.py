import pytest
from shared.services.llm import LLMService
from shared.prompts.evaluation_prompt import EVALUATION_SYSTEM_PROMPT, EVALUATION_HUMAN_PROMPT
from shared.schemas.evaluation import ComplianceEvaluationResult

@pytest.mark.asyncio
async def test_evaluation_compliant():
    result = await LLMService.generate_structured(
        system_prompt=EVALUATION_SYSTEM_PROMPT,
        human_prompt=EVALUATION_HUMAN_PROMPT,
        schema=ComplianceEvaluationResult,
        input_vars={
            "title": "Enable audit log retention",
            "description": "Configure systems to retain audit logs for a minimum of 5 years.",
            "required_evidence": "Audit log retention configuration screenshot",
            "evidence_text": "Source: Mock\nText: System verified: Enable audit log retention. Everything is working properly and finalized."
        }
    )
    assert result.status == "COMPLIANT"

@pytest.mark.asyncio
async def test_evaluation_partially_compliant():
    result = await LLMService.generate_structured(
        system_prompt=EVALUATION_SYSTEM_PROMPT,
        human_prompt=EVALUATION_HUMAN_PROMPT,
        schema=ComplianceEvaluationResult,
        input_vars={
            "title": "Create Policy",
            "description": "Draft a cyber policy.",
            "required_evidence": "Approved Cyber Policy",
            "evidence_text": "Source: Mock\nText: Draft policy mentions: Create Policy, but it is not formally approved."
        }
    )
    assert result.status == "PARTIALLY_COMPLIANT"
