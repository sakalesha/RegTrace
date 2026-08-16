"""Export a verified document's clause segmentation into a gold-standard JSON file.

The gold file records the clause hierarchy (section_number, parent_section,
hierarchy_level), page span, and title for every extracted clause so the eval
script can measure boundary precision, exact match and hierarchy accuracy.

Usage:
    python scripts/build_gold_clauses.py <document_id> <output.json> [<start_page> <end_page>]

Run from the backend/ directory.
"""

import asyncio
import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.clause_segmentation_agent import ClauseSegmentationAgent
from app.schemas.clause import ClauseSegmentationInput
from app.db.mongodb import db


async def run(document_id: str, output_path: str, start_page: int = None, end_page: int = None):
    db.connect()
    try:
        out = await ClauseSegmentationAgent().process(ClauseSegmentationInput(document_id=document_id))
        clauses = out.clauses

        if start_page is not None:
            clauses = [c for c in clauses if start_page <= c.page_number <= (end_page or start_page)]

        gold = [
            {
                "section_number": c.section_number,
                "parent_section": c.parent_section,
                "hierarchy_level": c.hierarchy_level,
                "chapter": c.chapter,
                "page_number": c.page_number,
                "title": c.title,
                "clause_type": c.clause_type,
                "text": c.text,
            }
            for c in clauses
        ]

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump({"document_id": document_id, "clauses": gold}, f, ensure_ascii=False, indent=2)

        print(f"Wrote {len(gold)} gold clauses to {output_path}")
    finally:
        db.disconnect()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    start = int(sys.argv[3]) if len(sys.argv) > 3 else None
    end = int(sys.argv[4]) if len(sys.argv) > 4 else None
    asyncio.run(run(sys.argv[1], sys.argv[2], start, end))
