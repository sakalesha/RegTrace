import asyncio
from agents.clause_segmentation import ClauseSegmentationAgent

test_text = """
--- Page 1 ---
CHAPTER 1: INTRODUCTION
1.1 Objective
This is the objective of the circular.
It applies to all brokers.

1.2 Scope
(a) First point in scope.
(b) Second point in scope.
(i) Sub point under b.

--- Page 2 ---
PART B: RULES
2. Compliance
You must comply.
"""

def test_parser():
    clauses = ClauseSegmentationAgent._parse_text(test_text, "DOC-TEST")
    for c in clauses:
        print(f"[{c.clause_id}] {c.clause_number} (Depth: {len(c.hierarchy_path)}, Parent: {c.parent_clause_id}) on Page {c.page_number}")
        print(f"Path: {c.hierarchy_path}")
        print(f"Text: {c.text}")
        print("-" * 40)

if __name__ == "__main__":
    test_parser()
