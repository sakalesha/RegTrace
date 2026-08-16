import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.ingestion_agent import IngestionAgent
from app.schemas.document import IngestionInput, DocumentMetadata
from app.services.parsing_service import ParsingService
from app.db.mongodb import db

async def run_test():
    # Setup test file
    test_pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "regulatory_corpus", "SEBI Master Circular.pdf"))
    
    if not os.path.exists(test_pdf_path):
        print(f"Error: {test_pdf_path} not found. Please place a sample PDF there.")
        return

    ingestion_agent = IngestionAgent()
    input_data = IngestionInput(
        file_path=test_pdf_path,
        file_name="test_parsing.pdf",
        metadata=DocumentMetadata(
            title="Test Parsing Document",
            document_type="Test"
        )
    )

    print("Starting Parsing Pipeline test...")
    try:
        # Initialize DB connection
        db.connect()
        
        # 1. Ingestion
        print("Running Ingestion Agent...")
        ingestion_output = await ingestion_agent.run(input_data)
        document_id = ingestion_output.document_id
        print(f"Ingested Document ID: {document_id}")
        print(f"File Storage Path: {ingestion_output.file_storage_path}")
        
        # 2. Parsing
        print("Running Parsing Service...")
        parsing_output = await ParsingService.parse_document(document_id)
        
        print("\n=== Parsing Successful ===")
        print(f"Document ID: {parsing_output['document_id']}")
        print(f"Total Pages Parsed: {parsing_output['total_pages']}")
        print(f"Status: {parsing_output['processing_status']}")
        
        # Verify in DB
        database = db.get_db()
        saved_doc = await database["documents"].find_one({"document_id": document_id})
        if saved_doc and saved_doc.get("pages"):
            print("\nDocument pages found in MongoDB!")
            print(f"First page preview: {saved_doc['pages'][0]['text'][:100]}...")
        else:
            print("\nError: Document pages not found in MongoDB.")
            
    except Exception as e:
        print(f"\nError during parsing pipeline: {e}")
    finally:
        db.disconnect()

if __name__ == "__main__":
    asyncio.run(run_test())
