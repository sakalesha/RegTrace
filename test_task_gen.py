import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from shared.database.mongodb import get_db
from agents.task_generation import TaskGenerationAgent

async def test_task_generation():
    db = get_db()
    
    # 1. Create a dummy approved obligation
    dummy_ob_id = "OBL-TEST-1234"
    await db.obligations.update_one(
        {"obligation_id": dummy_ob_id},
        {
            "$set": {
                "obligation_id": dummy_ob_id,
                "document_id": "DOC-TEST-123",
                "status": "APPROVED",
                "obligation_text": "Conduct cyber audit every financial year through CERT-In empanelled auditors.",
                "clause_number": "4.1",
                "evidence_type": "Cyber Audit Report",
                "frequency": "Yearly",
                "penalty_referenced": True
            }
        },
        upsert=True
    )
    
    print(f"Created dummy obligation: {dummy_ob_id}")
    
    # 2. Run the generator
    res = await TaskGenerationAgent.generate_task(dummy_ob_id)
    print("Generation result:", res)
    
    # 3. Check the task in DB
    if "task_id" in res:
        task = await db.compliance_tasks.find_one({"task_id": res["task_id"]})
        print("Generated Task:")
        import pprint
        pprint.pprint(task)

if __name__ == "__main__":
    asyncio.run(test_task_generation())
