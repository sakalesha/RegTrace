import asyncio
import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

from shared.schemas.obligation import ObligationExtractionResult

# Load env variables directly for the test script
load_dotenv()

async def test_llm():
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("ERROR: GROQ_API_KEY is not set in .env")
            return
            
        print("Testing GroqCloud LLM connection...")
        # Using Llama 3.3 70B, which is excellent for structured extraction
        llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            api_key=api_key
        )
        
        # Test basic prompt
        result = await llm.ainvoke("Respond with the word 'SUCCESS' if you can read this.")
        print("Basic LLM Response:", result.content)
        
        # Test structured output
        print("\nTesting structured output...")
        structured_llm = llm.with_structured_output(ObligationExtractionResult)
        
        test_text = "The Stock Broker must maintain Client KYC Records continuously for all active clients."
        structured_result = await structured_llm.ainvoke(test_text)
        
        print(f"Extracted {len(structured_result.obligations)} obligations:")
        for obs in structured_result.obligations:
            print(obs.model_dump())
            
        print("\nAll LLM tests passed successfully!")
    except Exception as e:
        print(f"Error testing LLM: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm())
