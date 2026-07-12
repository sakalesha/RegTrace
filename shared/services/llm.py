import os
import time
from typing import Type, TypeVar, Any, Dict
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from shared.config.settings import settings
from shared.services.logger import Logger

T = TypeVar("T", bound=BaseModel)

class LLMService:
    _llm = None
    MAX_RETRIES = 3

    @classmethod
    def get_llm(cls):
        if cls._llm is None:
            cls._llm = ChatGroq(
                temperature=0.0,
                model_name=settings.llm_model,
                api_key=settings.groq_api_key
            )
        return cls._llm

    @classmethod
    async def generate_structured(
        cls,
        system_prompt: str,
        human_prompt: str,
        schema: Type[T],
        input_vars: Dict[str, Any]
    ) -> T:
        llm = cls.get_llm()
        structured_llm = llm.with_structured_output(schema)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])
        
        chain = prompt | structured_llm
        
        for attempt in range(cls.MAX_RETRIES):
            try:
                return await chain.ainvoke(input_vars)
            except Exception as e:
                Logger.warning("LLMService", f"Structured output failed (Attempt {attempt+1}/{cls.MAX_RETRIES}): {e}")
                if attempt == cls.MAX_RETRIES - 1:
                    Logger.error("LLMService", "Max retries reached for structured output", exc=e)
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff

    @classmethod
    async def generate_text(
        cls,
        system_prompt: str,
        human_prompt: str,
        input_vars: Dict[str, Any],
        temperature: float = 0.0
    ) -> str:
        llm = ChatGroq(
            temperature=temperature,
            model_name=settings.llm_model,
            api_key=settings.groq_api_key
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])
        
        chain = prompt | llm
        
        for attempt in range(cls.MAX_RETRIES):
            try:
                response = await chain.ainvoke(input_vars)
                return response.content
            except Exception as e:
                Logger.warning("LLMService", f"Text generation failed (Attempt {attempt+1}/{cls.MAX_RETRIES}): {e}")
                if attempt == cls.MAX_RETRIES - 1:
                    Logger.error("LLMService", "Max retries reached for text generation", exc=e)
                    raise
                time.sleep(2 ** attempt)
