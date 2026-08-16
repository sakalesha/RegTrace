import asyncio
import os
import sys
from collections import Counter

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.mongodb import db

DOC = "7b8a1ab6-1376-485f-be5e-08c0ce0581b2"


async def run():
    db.connect()
    database = db.get_db()
    clauses = await database["clauses"].find({"document_id": DOC}).to_list(None)
    print("stored clauses:", len(clauses))

    for c in clauses:
        title = (c.get("title") or "")[:35]
        print(f"{c.get('clause_id',''):<46} sec={c.get('section_number',''):<14} "
              f"parent={c.get('parent_section') or '-':<8} ch={c.get('chapter') or '-':<4} "
              f"type={c.get('clause_type'):<10} :: {title}")

    print("\n=== duplicate section_number values ===")
    counts = Counter(c.get("section_number") for c in clauses)
    for sec, n in sorted(counts.items()):
        if n > 1:
            print(f"  {sec!r} x{n}")

    print("\n=== duplicate chapter values ===")
    chcounts = Counter(c.get("chapter") for c in clauses)
    for ch, n in sorted(chcounts.items(), key=lambda kv: (kv[0] or "", kv[1])):
        print(f"  {ch!r} x{n}")

    db.disconnect()


if __name__ == "__main__":
    asyncio.run(run())
