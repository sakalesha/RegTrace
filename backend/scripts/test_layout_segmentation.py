"""End-to-end test of layout-aware clause segmentation.

Parses a local PDF into a temporary DB document (with layout blocks), runs the
ClauseSegmentationAgent, prints stats, then removes the temp document.

Usage:
    python scripts/test_layout_segmentation.py <path-to-pdf>
"""

import asyncio
import os
import sys
from collections import Counter

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import fitz

from app.agents.clause_segmentation_agent import ClauseSegmentationAgent
from app.schemas.clause import ClauseSegmentationInput
from app.schemas.document import DocumentStatus
from app.db.mongodb import db
from app.utils.layout import extract_blocks


async def run(pdf_path):
    if not os.path.exists(pdf_path):
        print(f"PDF not found: {pdf_path}")
        return

    db.connect()
    database = db.get_db()
    doc_id = "layout_test_temp"

    try:
        await database["documents"].delete_many({"document_id": doc_id})

        pages = []
        doc = fitz.open(pdf_path)
        for page_num in range(doc.page_count):
            page = doc.load_page(page_num)
            text = page.get_text("text").strip()
            blocks = [b.dict() for b in extract_blocks(page)]
            pages.append({"page_number": page_num + 1, "text": text, "blocks": blocks})

        await database["documents"].insert_one({
            "document_id": doc_id,
            "title": "layout test",
            "processing_status": DocumentStatus.PARSED.value,
            "pages": pages,
        })
        doc.close()

        print(f"PDF: {pdf_path} ({len(pages)} pages)")

        agent = ClauseSegmentationAgent()
        out = await agent.process(ClauseSegmentationInput(document_id=doc_id))
        clauses = out.clauses
        print(f"\nTotal clauses: {out.total_clauses}")
        print(f"Types: {dict(Counter(c.clause_type for c in clauses))}")
        print(f"Levels: {dict(sorted(Counter(c.hierarchy_level for c in clauses).items()))}")
        print(f"No heading: {sum(1 for c in clauses if not c.heading)}, no title: {sum(1 for c in clauses if not c.title)}")
        print(f"Duplicate ids: {out.total_clauses - len({c.clause_id for c in clauses})}")

        # --- TOC-leak assertion ---------------------------------------------
        # The agent skips table-of-contents pages it detected. No clause may
        # originate from a detected TOC page, otherwise TOC headings leak into
        # the extraction as spurious clauses/chapters.
        toc_pages = getattr(agent, "_last_toc_pages", set())
        leaked = sorted({c.page_number for c in clauses} & toc_pages)
        if toc_pages:
            print(f"\nTOC pages detected: {sorted(toc_pages)}")
            if leaked:
                print(f"FAIL: {len(leaked)} clauses originate from TOC pages {leaked}")
            else:
                print(f"OK: no clauses originate from TOC pages")
        else:
            print("\nTOC pages detected: none")

        # --- Page-continuation assertion ------------------------------------
        # A clause split at a page boundary (heading on page N, body on page
        # N+1) must be captured as one clause. A genuine split re-emits the
        # same (chapter, section_number) on the SAME page with the SAME
        # heading, followed by continuation text that lacks a heading. Repeated
        # section numbers across different pages, or with different headings,
        # are legitimate (annexure two-column tables, repeated numbering in
        # separate subsections) and are not flagged.
        norm = lambda s: (s or "").strip().lower()
        split_candidates = []
        seen_pairs = {}
        for c in clauses:
            key = (c.chapter, c.section_number)
            seen_pairs.setdefault(key, []).append(c)
        for (ch, sec), grp in sorted(seen_pairs.items(), key=lambda kv: (kv[0][0] or "", kv[0][1] or "")):
            if len(grp) < 2:
                continue
            by_page_heading = Counter(
                (c.page_number, norm(c.heading or c.title)) for c in grp)
            for (page, heading), cnt in by_page_heading.items():
                if cnt > 1 and heading:
                    split_candidates.append((ch, sec, page, heading, cnt))
        if split_candidates:
            print(f"FAIL: {len(split_candidates)} page-continuation splits (same page, same heading):")
            for ch, sec, page, heading, cnt in split_candidates[:10]:
                print(f"  ch={ch!r} section={sec!r} page={page} x{cnt} :: {heading[:50]}")
        else:
            print("OK: no page-continuation splits (no re-emitted heading on the same page)")

        chapters = sorted({c.chapter for c in clauses if c.chapter}, key=lambda s: (len(s), s))
        print(f"\nChapters detected: {len(chapters)} -> {chapters[:40]}")

        print("\n--- First 25 clauses ---")
        for c in clauses[:25]:
            parent = c.parent_section or "-"
            chap = c.chapter or "-"
            print(f"[{c.clause_type}/{c.hierarchy_level}] ch={chap:<3} {c.section_number:<14} p={parent:<10} {c.title[:45] if c.title else ''}")

        print("\n--- Headings captured (sections with real text) ---")
        shown = 0
        for c in clauses:
            if c.clause_type in ("section", "subsection") and c.heading and shown < 20:
                print(f"  {c.section_number:<12} {c.heading[:60]}")
                shown += 1
    finally:
        await database["documents"].delete_many({"document_id": doc_id})
        db.disconnect()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    asyncio.run(run(sys.argv[1]))