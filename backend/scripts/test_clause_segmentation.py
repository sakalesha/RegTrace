import asyncio
import os
import sys
from collections import Counter

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.clause_segmentation_agent import ClauseSegmentationAgent
from app.schemas.clause import ClauseSegmentationInput
from app.db.mongodb import db


async def run_test():
    db.connect()
    database = db.get_db()
    doc = await database["documents"].find_one({"processing_status": {"$ne": None}})
    if not doc:
        print("No document found in DB.")
        return

    doc_id = doc["document_id"]
    print(f"Document: {doc.get('title', doc_id)} ({doc_id})")
    print(f"Pages stored: {len(doc.get('pages', []))}")

    agent = ClauseSegmentationAgent()
    output = await agent.process(ClauseSegmentationInput(document_id=doc_id))

    print(f"\nTotal clauses: {output.total_clauses}")
    types = Counter(c.clause_type for c in output.clauses)
    print(f"Types: {dict(types)}")

    levels = Counter(c.hierarchy_level for c in output.clauses)
    print(f"Levels: {dict(sorted(levels.items()))}")

    no_heading = sum(1 for c in output.clauses if not c.heading)
    no_title = sum(1 for c in output.clauses if not c.title)
    print(f"Clauses with no heading: {no_heading}, no title: {no_title}")

    dup_ids = len(output.clauses) - len({c.clause_id for c in output.clauses})
    print(f"Duplicate clause_ids: {dup_ids}")

    print("\n--- Sample tree (first 30) ---")
    for c in output.clauses[:30]:
        parent = c.parent_section or "-"
        print(f"[{c.clause_type}/{c.hierarchy_level}] {c.section_number:<18} parent={parent:<12} title={c.title[:50] if c.title else ''}")

    print("\n--- Sample bullets/subclauses ---")
    for c in output.clauses:
        if c.section_number and "(" in c.section_number:
            print(f"  {c.section_number:<24} parent={c.parent_section} title={c.title[:40] if c.title else ''}")
            if sum(1 for _ in [c]) >= 5:
                break

    db.disconnect()


if __name__ == "__main__":
    asyncio.run(run_test())