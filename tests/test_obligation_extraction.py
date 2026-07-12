import pytest
import asyncio
from shared.schemas.obligation import ObligationExtractionResult
from shared.services.llm import LLMService
from shared.prompts.obligation_prompt import OBLIGATION_SYSTEM_PROMPT, OBLIGATION_HUMAN_PROMPT
from shared.prompts.validation_prompt import VALIDATION_SYSTEM_PROMPT, VALIDATION_HUMAN_PROMPT

@pytest.mark.asyncio
async def test_single_obligation():
    text = "The intermediary shall maintain logs for five years."
    result = await LLMService.generate_structured(
        system_prompt=OBLIGATION_SYSTEM_PROMPT,
        human_prompt=OBLIGATION_HUMAN_PROMPT,
        schema=ObligationExtractionResult,
        input_vars={"page": 1, "heading": "Logs", "section": "1.1", "text": text}
    )
    assert len(result.obligations) == 1
    ob = result.obligations[0]
    assert ob.actor.lower() in ["intermediary", "the intermediary"]
    assert "maintain" in ob.action.lower()
    assert "logs" in ob.object.lower()
    
@pytest.mark.asyncio
async def test_multiple_obligations():
    text = "Maintain logs. Submit reports quarterly. Notify SEBI within 24 hours."
    result = await LLMService.generate_structured(
        system_prompt=OBLIGATION_SYSTEM_PROMPT,
        human_prompt=OBLIGATION_HUMAN_PROMPT,
        schema=ObligationExtractionResult,
        input_vars={"page": 1, "heading": "Rules", "section": "1", "text": text}
    )
    assert len(result.obligations) >= 3

@pytest.mark.asyncio
async def test_no_obligations():
    text = "Introduction. This document outlines the purpose of the new guidelines."
    result = await LLMService.generate_structured(
        system_prompt=OBLIGATION_SYSTEM_PROMPT,
        human_prompt=OBLIGATION_HUMAN_PROMPT,
        schema=ObligationExtractionResult,
        input_vars={"page": 1, "heading": "Intro", "section": "1", "text": text}
    )
    assert len(result.obligations) == 0

@pytest.mark.asyncio
async def test_validation_agent_logic():
    # Simulate extraction hallucination
    chunk_text = "The broker must register with SEBI."
    extracted = [
        {"actor": "Broker", "action": "Register", "object": "SEBI", "confidence": 0.9},
        {"actor": "Broker", "action": "Maintain", "object": "Logs", "confidence": 0.9} # Hallucination
    ]
    
    result = await LLMService.generate_structured(
        system_prompt=VALIDATION_SYSTEM_PROMPT,
        human_prompt=VALIDATION_HUMAN_PROMPT,
        schema=ObligationExtractionResult,
        input_vars={
            "text": chunk_text,
            "extracted_obligations": str(extracted)
        }
    )
    
    # Should drop the hallucination
    assert len(result.obligations) == 1
    assert result.obligations[0].action.lower() == "register"
