import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.ingestion_agent import IngestionAgent
from app.schemas.document import IngestionInput, DocumentMetadata
from app.db.mongodb import db

async def run_test():
    # Setup test file
    test_pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "regulatory_corpus", "sebi_master_circular_stockbrokers.pdf"))
    
    if not os.path.exists(test_pdf_path):
        # Create a dummy PDF for testing if the actual one doesn't exist
        print("Test PDF not found. Creating a dummy PDF for testing...")
        import fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "This is a test SEBI circular.")
        doc.set_metadata({"title": "Test SEBI Circular", "author": "SEBI"})
        os.makedirs(os.path.dirname(test_pdf_path), exist_ok=True)
        doc.save(test_pdf_path)
        doc.close()

    agent = IngestionAgent()
    input_data = IngestionInput(
        file_path=test_pdf_path,
        file_name="sebi_master_circular_stockbrokers.pdf",
        metadata=DocumentMetadata(
            title="SEBI Master Circular for Stockbrokers",
            document_type="Master Circular"
        )
    )

    print("Starting Ingestion Agent test...")
    try:
        # Initialize DB connection
        db.connect()
        
        output = await agent.run(input_data)
        
        print("\n=== Ingestion Successful ===")
        print(f"Document ID: {output.document_id}")
        print(f"Title: {output.title}")
        print(f"Status: {output.processing_status.value}")
        print(f"Storage Path: {output.file_storage_path}")
        print(f"Hash: {output.file_hash}")
        
        # Verify in DB
        database = db.get_db()
        saved_doc = await database["documents"].find_one({"document_id": output.document_id})
        if saved_doc:
            print("\nDocument found in MongoDB!")
        else:
            print("\nError: Document not found in MongoDB.")
            
    except Exception as e:
        print(f"\nError during ingestion: {e}")
    finally:
        db.disconnect()

if __name__ == "__main__":
    asyncio.run(run_test())
