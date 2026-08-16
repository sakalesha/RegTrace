"""
Benchmark for clause extraction quality.

Compares the ClauseSegmentationAgent output for a stored document against a
baseline CSV (the previous extraction run) and reports:

  - clause count / type / level distribution
  - boundary recall: fraction of baseline clause texts covered by new clauses
  - heading completeness
  - duplicate clause_id count
  - hierarchy repair findings from ClauseValidator

Gold mode (--gold <file.json>):

  - boundary recall and precision (which new clauses match a gold clause)
  - exact clause match (normalized text equality)
  - hierarchy accuracy (section_number + parent_section + level agreement)
  - TOC-leak assertion (no clause produced on a TOC page, no duplicate nodes)

Usage:
    python scripts/eval_clause_extraction.py <document_id> <baseline.csv>
    python scripts/eval_clause_extraction.py <document_id> <baseline.csv> --gold <gold.json>

Run from the backend/ directory.
"""

import asyncio
import csv
import json
import os
import re
import sys
from collections import Counter

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.clause_segmentation_agent import ClauseSegmentationAgent
from app.schemas.clause import ClauseSegmentationInput
from app.services.clause_validator import ClauseValidator
from app.db.mongodb import db


def normalize(text: str) -> str:
    """Lowercase and collapse whitespace/punctuation for fuzzy matching."""
    text = text.lower()
    text = re.sub(r"[\s\u00a0]+", " ", text)
    text = re.sub(r"[^\w ]", "", text)
    return text.strip()


def load_gold(path: str) -> list:
    """Load a gold JSON file produced by scripts/build_gold_clauses.py."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("clauses", [])


def gold_metrics(clauses, gold_clauses):
    """Compare new clauses against a gold set.

    Returns (recall, precision, exact_match, hierarchy_accuracy, misses) where
    exact_match is the fraction of new clauses whose normalized text equals some
    gold clause text, and hierarchy_accuracy is the fraction whose
    (section_number, parent_section, hierarchy_level) triple matches a gold
    clause with the same normalized text.
    """
    gold_by_text = {}
    for g in gold_clauses:
        key = normalize(g.get("text") or "")
        if key:
            gold_by_text.setdefault(key, g)

    gold_keys = set(gold_by_text.keys())
    new_norm = [normalize(c.text) for c in clauses]

    # recall: gold clauses covered by some new clause (fuzzy, as before)
    recalled = 0
    for gkey in gold_keys:
        if any(gkey in nn or nn in gkey for nn in new_norm if nn):
            recalled += 1

    # precision: new clauses that match some gold clause (fuzzy)
    precise = 0
    for nn in new_norm:
        if not nn:
            continue
        if any(nn in gk or gk in nn for gk in gold_keys):
            precise += 1

    # exact match: new clause normalized text equals a gold text exactly
    exact = sum(1 for nn in new_norm if nn and nn in gold_keys)

    # hierarchy accuracy: for exact-matched clauses, compare structure triple.
    # The chapter field is used in place of parent_section because the validator
    # re-points chapter parents ("I", "II") to None; chapter survives repair and
    # is the stable structural signal a gold set should record.
    hier_ok = 0
    hier_total = 0
    hierarchy_misses = []
    for c in clauses:
        key = normalize(c.text)
        g = gold_by_text.get(key)
        if not g:
            continue
        hier_total += 1
        triple = (c.section_number, c.chapter, c.hierarchy_level)
        gold_triple = (g.get("section_number"), g.get("chapter"), g.get("hierarchy_level"))
        if triple == gold_triple:
            hier_ok += 1
        else:
            hierarchy_misses.append((c.section_number, triple, gold_triple))

    return {
        "recall": recalled / max(len(gold_keys), 1),
        "precision": precise / max(len(new_norm), 1),
        "exact_match": exact / max(len(new_norm), 1),
        "hierarchy_accuracy": hier_ok / max(hier_total, 1),
        "hierarchy_compared": hier_total,
        "hierarchy_misses": hierarchy_misses[:10],
    }


def toc_leak_assertion(clauses, toc_pages):
    """Find new clauses emitted on TOC pages (a regression signal)."""
    leaked = [c for c in clauses if c.page_number in toc_pages]
    return leaked


def boundary_recall(new_clauses, baseline_texts, threshold=0.6):
    """Fraction of baseline clause texts covered by some new clause text."""
    new_norm = [normalize(c.text) for c in new_clauses]
    hits = 0
    details = []
    for base in baseline_texts:
        bn = normalize(base)
        if not bn:
            continue
        best = 0.0
        for nn in new_norm:
            if not nn:
                continue
            if bn in nn or nn in bn:
                best = 1.0
                break
            # approximate overlap
            words = set(bn.split())
            if not words:
                continue
            covered = sum(1 for w in words if w in nn)
            ratio = covered / len(words)
            if ratio > best:
                best = ratio
        hits += best >= threshold
        if best < threshold:
            details.append((base[:80], round(best, 2)))
    return hits, len(baseline_texts), details


async def run(document_id: str, baseline_csv: str, gold_path: str = None, toc_pages: set = None):
    db.connect()
    try:
        database = db.get_db()
        doc = await database["documents"].find_one({"document_id": document_id})
        if not doc:
            print(f"Document {document_id} not found.")
            return

        baseline_texts = []
        with open(baseline_csv, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("Text"):
                    baseline_texts.append(row["Text"])

        print(f"=== Clause Extraction Benchmark ===")
        print(f"Document : {doc.get('title', document_id)} ({document_id})")
        print(f"Baseline : {baseline_csv} ({len(baseline_texts)} clauses)")

        out = await ClauseSegmentationAgent().process(ClauseSegmentationInput(document_id=document_id))
        clauses = out.clauses

        repaired, findings = ClauseValidator.validate_and_repair(clauses)

        print(f"\n--- Extraction stats (new segmenter) ---")
        print(f"Clauses extracted : {out.total_clauses} (baseline: {len(baseline_texts)})")
        print(f"Types             : {dict(Counter(c.clause_type for c in clauses))}")
        print(f"Levels            : {dict(sorted(Counter(c.hierarchy_level for c in clauses).items()))}")
        print(f"No heading        : {sum(1 for c in clauses if not c.heading)}")
        print(f"No title          : {sum(1 for c in clauses if not c.title)}")
        print(f"Duplicate ids     : {out.total_clauses - len({c.clause_id for c in clauses})}")

        if toc_pages:
            leaked = toc_leak_assertion(clauses, toc_pages)
            status = "OK" if not leaked else "FAIL"
            print(f"\n--- TOC leak assertion ---")
            print(f"Clauses on TOC pages: {len(leaked)} [{status}]")
            for c in leaked[:10]:
                print(f"  page {c.page_number}: {c.section_number} {c.title[:40] if c.title else ''}")

        if gold_path:
            gold_clauses = load_gold(gold_path)
            print(f"\n--- Gold-standard evaluation (gold: {len(gold_clauses)} clauses) ---")
            m = gold_metrics(clauses, gold_clauses)
            print(f"Boundary recall    : {m['recall']:.1%}")
            print(f"Boundary precision : {m['precision']:.1%}")
            print(f"Exact match        : {m['exact_match']:.1%}")
            print(f"Hierarchy accuracy : {m['hierarchy_accuracy']:.1%} (on {m['hierarchy_compared']} exact-matched clauses)")
            for sn, triple, gold_triple in m["hierarchy_misses"]:
                print(f"  [hierarchy] {sn}: new={triple} gold={gold_triple}")

        print(f"\n--- Boundary recall (new vs baseline) ---")
        hits, total, misses = boundary_recall(clauses, baseline_texts)
        print(f"Covered baseline clauses: {hits}/{total} ({hits / max(total, 1):.1%})")
        if misses:
            print("Uncovered baseline clauses:")
            for text, score in misses[:10]:
                print(f"  [{score:.0%}] {text!r}")

        print(f"\n--- Validator findings ---")
        sev = Counter(s for s, _ in findings)
        print(f"Findings: {len(findings)} {dict(sev)}")
        for sev_, msg in findings[:15]:
            print(f"  [{sev_}] {msg}")
    finally:
        db.disconnect()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    args = sys.argv[1:]
    gold_path = None
    toc_pages = None
    if "--gold" in args:
        i = args.index("--gold")
        gold_path = args[i + 1]
        del args[i:i + 2]
    if "--toc" in args:
        i = args.index("--toc")
        toc_pages = {int(p) for p in args[i + 1].split(",") if p.strip().isdigit()}
        del args[i:i + 2]
    asyncio.run(run(args[0], args[1], gold_path, toc_pages))