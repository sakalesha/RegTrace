"""
Benchmark for obligation extraction quality.

Compares the ObligationExtractionAgent output against a hand-curated gold set
(gold_obligations.json) for the clauses flagged has_obligations=True in the
sample document. Clause texts are read from _obligation_clauses.json so the
eval is reproducible without a live DB.

Metrics:
  - obligation recall / precision / exact match (normalized actor+action)
  - field accuracy on matched pairs: actor, is_mandatory, deadline presence,
    deadline value, frequency
  - per-clause count agreement (missed obligations / hallucinations)
  - deadline recall (gold obligations with a deadline that the agent captured)

Usage:
    python scripts/eval_obligation_extraction.py \
        --gold ../../data/regulatory_corpus/gold_obligations.json \
        --clauses ../../data/regulatory_corpus/_obligation_clauses.json \
        [--limit N] [--sections 3.2,5.2] [--save predictions.json]

Run from the backend/ directory. GROQ_API_KEY must be set.
"""

import argparse
import asyncio
import json
import os
import re
import sys
from collections import Counter

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from app.agents.obligation_extraction_agent import ObligationExtractionAgent

MATCH_THRESHOLD = 0.6


def normalize(text: str) -> str:
    """Lowercase and collapse whitespace/punctuation for fuzzy matching."""
    text = text.lower()
    text = re.sub(r"[\s\u00a0]+", " ", text)
    text = re.sub(r"[^\w ]", "", text)
    return text.strip()


def tokenize(text: str) -> set:
    return set(normalize(text).split())


def sim(a: str, b: str) -> float:
    """Token-level similarity that tolerates verbose phrasing (superset)."""
    ta, tb = tokenize(a), tokenize(b)
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    jaccard = inter / len(ta | tb)
    containment = max(inter / len(ta), inter / len(tb))
    return max(jaccard, containment)


def ob_key(ob: dict) -> str:
    return f"{ob.get('actor') or ''} {ob.get('action') or ''}"


def deadline_present(ob: dict) -> bool:
    d = (ob.get("deadline") or "").strip()
    return bool(d) and not re.fullmatch(r"(null|none|n/a|na)", d, re.I)


def fields_eq(a, b, key, fuzzy=False):
    av = a.get(key)
    bv = b.get(key)
    if av is None or (isinstance(av, str) and not av.strip()):
        av = None
    if bv is None or (isinstance(bv, str) and not bv.strip()):
        bv = None
    if av is None and bv is None:
        return True
    if av is None or bv is None:
        return False
    if isinstance(av, bool) or isinstance(bv, bool):
        return bool(av) == bool(bv)
    if fuzzy:
        return sim(str(av), str(bv)) >= 0.5
    return normalize(str(av)) == normalize(str(bv))


def match_obligations(gold_obs, pred_obs):
    """Greedy best-first matching of gold <-> predicted obligations.

    Returns (pairs, missed_gold, extra_pred) where pairs is a list of
    (gold_ob, pred_ob, score) tuples.
    """
    pairs = []
    used_pred = set()
    for g in gold_obs:
        gk = ob_key(g)
        best, best_i, best_score = None, None, 0.0
        for i, p in enumerate(pred_obs):
            if i in used_pred:
                continue
            score = sim(gk, ob_key(p))
            if score > best_score:
                best, best_i, best_score = p, i, score
        if best is not None and best_score >= MATCH_THRESHOLD:
            pairs.append((g, best, best_score))
            used_pred.add(best_i)
    missed = [g for g in gold_obs if not any(g is pg for pg, _, _ in pairs)]
    extra = [p for i, p in enumerate(pred_obs) if i not in used_pred]
    return pairs, missed, extra


def aggregate(rows, clause_texts):
    """Compute aggregate metrics from per-clause eval rows."""
    gold_total = pred_total = matched_total = exact_total = 0
    actor_ok = mand_ok = dl_presence_ok = dl_value_ok = freq_ok = 0
    dl_captured = dl_gold = 0
    missed_flat, extra_flat = [], []
    dl_propagation = dl_dropped = 0

    for row in rows:
        gold = row["gold"]
        pred = row["pred"]
        gold_total += len(gold)
        pred_total += len(pred)
        matched_total += len(row["pairs"])
        exact_total += sum(1 for _, _, s in row["pairs"] if s >= 0.95)
        missed_flat.extend(row["missed"])
        extra_flat.extend(row["extra"])

        for g, p, _ in row["pairs"]:
            actor_ok += fields_eq(g, p, "actor", fuzzy=True)
            mand_ok += fields_eq(g, p, "is_mandatory")
            dl_presence_ok += fields_eq(g, p, "deadline")
            freq_ok += fields_eq(g, p, "frequency")
            if deadline_present(g):
                dl_gold += 1
                if deadline_present(p):
                    dl_captured += 1
                    if fields_eq(g, p, "deadline", fuzzy=True):
                        dl_value_ok += 1
                else:
                    dl_dropped += 1
            elif deadline_present(p):
                dl_propagation += 1

    n = max(matched_total, 1)
    return {
        "gold_obligations": gold_total,
        "predicted_obligations": pred_total,
        "recall": matched_total / max(gold_total, 1),
        "precision": matched_total / max(pred_total, 1),
        "exact_match": exact_total / max(gold_total, 1),
        "actor_accuracy": actor_ok / n,
        "is_mandatory_accuracy": mand_ok / n,
        "deadline_presence_accuracy": dl_presence_ok / n,
        "frequency_accuracy": freq_ok / n,
        "deadline_recall": dl_captured / max(dl_gold, 1),
        "deadline_captured": dl_captured,
        "deadline_value_accuracy": dl_value_ok / max(dl_captured, 1),
        "deadline_gold": dl_gold,
        "deadline_dropped": dl_dropped,
        "deadline_propagated": dl_propagation,
        "missed_obligations": missed_flat,
        "extra_obligations": extra_flat,
    }


async def run_pass(agent, sections, clause_texts, gold_by_section, verbose=True):
    """Run the agent over all sections; returns per-clause rows."""
    rows = []
    for i, section in enumerate(sections, 1):
        text = clause_texts.get(section)
        gold = gold_by_section.get(section, [])
        if text is None:
            print(f"[skip] {section}: clause text not found")
            continue
        pred = []
        try:
            result = await agent.process(text)
            pred = [ob.model_dump() for ob in result.obligations]
        except Exception as e:
            print(f"[error] {section}: {e}")
        pairs, missed, extra = match_obligations(gold, pred)
        rows.append({"section": section, "gold": gold, "pred": pred,
                     "pairs": pairs, "missed": missed, "extra": extra})
        if verbose:
            status = "OK" if not missed and not extra else \
                     ("MISS" if missed else "EXTRA")
            print(f"[{i}/{len(sections)}] {section}: gold={len(gold)} pred={len(pred)} "
                  f"matched={len(pairs)} {status}")
    return rows


async def main():
    parser = argparse.ArgumentParser(description="Obligation extraction benchmark")
    parser.add_argument("--gold", required=True, help="Path to gold_obligations.json")
    parser.add_argument("--clauses", required=True, help="Path to _obligation_clauses.json")
    parser.add_argument("--limit", type=int, default=None, help="Run on only the first N clauses")
    parser.add_argument("--sections", default=None, help="Comma-separated subset of section numbers")
    parser.add_argument("--save", default=None, help="Save per-clause predictions as JSON")
    parser.add_argument("--load", default=None, help="Reuse predictions JSON from a prior --save run")
    parser.add_argument("--runs", type=int, default=1,
                        help="Number of independent passes; metrics are averaged across runs")
    args = parser.parse_args()

    if not os.environ.get("GROQ_API_KEY"):
        print("ERROR: GROQ_API_KEY is not set.")
        sys.exit(1)

    with open(args.gold, encoding="utf-8") as f:
        gold_data = json.load(f)
    with open(args.clauses, encoding="utf-8") as f:
        clause_list = json.load(f)

    clause_texts = {c["section_number"]: c["text"] for c in clause_list}
    gold_by_section = {c["section_number"]: c["obligations"] for c in gold_data["clauses"]}

    sections = list(gold_by_section.keys())
    if args.sections:
        wanted = {s.strip() for s in args.sections.split(",") if s.strip()}
        sections = [s for s in sections if s in wanted]
    if args.limit:
        sections = sections[: args.limit]

    print(f"=== Obligation Extraction Benchmark ===")
    print(f"Document      : {gold_data.get('document_id')}")
    print(f"Gold clauses  : {len(sections)} | Gold obligations: "
          f"{sum(len(gold_by_section[s]) for s in sections)}")
    print(f"Agent model   : llama-3.1-8b-instant (Groq) | Runs: {args.runs}")

    metric_keys = ["recall", "precision", "exact_match", "actor_accuracy",
                   "is_mandatory_accuracy", "deadline_presence_accuracy",
                   "frequency_accuracy", "deadline_recall", "deadline_value_accuracy"]

    if args.load:
        with open(args.load, encoding="utf-8") as f:
            saved = {r["section"]: r["pred"] for r in json.load(f)}
        rows = []
        for section in sections:
            gold = gold_by_section.get(section, [])
            pred = saved.get(section, [])
            pairs, missed, extra = match_obligations(gold, pred)
            rows.append({"section": section, "gold": gold, "pred": pred,
                         "pairs": pairs, "missed": missed, "extra": extra})
        print(f"Reusing predictions from {args.load}\n")
        all_rows = [rows]
    else:
        agent = ObligationExtractionAgent()
        all_rows = []
        for run in range(1, args.runs + 1):
            print(f"\n--- Pass {run}/{args.runs} ---")
            verbose = args.runs == 1
            rows = await run_pass(agent, sections, clause_texts, gold_by_section,
                                  verbose=verbose)
            all_rows.append(rows)
            if args.save:
                base, _, ext = args.save.rpartition(".")
                path = f"{base}_r{run}.{ext}" if args.runs > 1 else args.save
                with open(path, "w", encoding="utf-8") as f:
                    json.dump([{k: r[k] for k in ("section", "pred")} for r in rows],
                              f, indent=2)
                print(f"Saved predictions to {path}")

    rows = all_rows[0]

    if args.runs == 1:
        print(f"\n--- Per-clause diff (missed / extra) ---")
        for row in rows:
            for g in row["missed"]:
                print(f"  [MISS {row['section']}] actor={g['actor']!r} "
                      f"action={g['action'][:80]!r} dl={g.get('deadline')}")
            for p in row["extra"]:
                print(f"  [EXTRA {row['section']}] actor={p['actor']!r} "
                      f"action={p['action'][:80]!r} dl={p.get('deadline')}")

    print(f"\n--- Aggregate metrics ---")
    aggs = [aggregate(r, clause_texts) for r in all_rows]

    def fmt(v):
        return f"{v:.1%}"

    labels = {
        "recall": "Recall",
        "precision": "Precision",
        "exact_match": "Exact match (>=0.95)",
        "actor_accuracy": "Actor accuracy",
        "is_mandatory_accuracy": "is_mandatory accuracy",
        "deadline_presence_accuracy": "Deadline presence acc.",
        "frequency_accuracy": "Frequency accuracy",
        "deadline_recall": "Deadline recall",
        "deadline_value_accuracy": "Deadline value acc.",
    }
    for key in metric_keys:
        vals = [a[key] for a in aggs]
        mean = sum(vals) / len(vals)
        lo, hi = min(vals), max(vals)
        spread = f" [{lo:.1%}..{hi:.1%}]" if args.runs > 1 else ""
        print(f"{labels[key]:<24}: {fmt(mean)}{spread}")

    a = aggs[0]
    print(f"Gold obligations        : {a['gold_obligations']}")
    print(f"Predicted obligations   : {a['predicted_obligations']} "
          f"(mean {sum(x['predicted_obligations'] for x in aggs) / len(aggs):.1f})")
    print(f"Deadline dropped (r1)   : {a['deadline_dropped']}")
    print(f"Deadline propagated (r1): {a['deadline_propagated']}")

    dist = Counter(len(r["pred"]) for r in rows)
    print(f"Pred count distribution : {dict(sorted(dist.items()))}")


if __name__ == "__main__":
    asyncio.run(main())
