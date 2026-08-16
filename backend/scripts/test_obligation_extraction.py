import asyncio
import os
import json
from dotenv import load_dotenv

# Ensure we're in the right directory or pythonpath is set
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.obligation_extraction_agent import ObligationExtractionAgent

load_dotenv()

async def main():
    if not os.environ.get("GROQ_API_KEY"):
        print("ERROR: GROQ_API_KEY is not set.")
        return

    agent = ObligationExtractionAgent()
    
    sample_text = """
    13.2.3. The internal auditor shall submit report; member shall place it before the Board and forward it to the Stock Exchange / Clearing Corporation within two months.
    """
    
    print("Running extraction on sample text...")
    print("-" * 40)
    print(sample_text)
    print("-" * 40)
    
    try:
        result = await agent.run(sample_text)
        print("Extraction Result:")
        # Dump the Pydantic model to JSON
        print(result.model_dump_json(indent=2))
    except Exception as e:
        print(f"Error during extraction: {e}")

if __name__ == "__main__":
    asyncio.run(main())
