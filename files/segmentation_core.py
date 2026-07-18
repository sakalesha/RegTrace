"""
RegTrace — Clause Segmentation Agent (core parser)
====================================================

Deterministic, rule-based parser that converts the Ingestion Agent's raw
text + layout output into a hierarchically-structured set of Clause objects.

Design intent (see design doc):
  - No LLM here. Segmentation is a mechanical, rule-governed problem.
    Regex detects numbering patterns; layout metadata (when available)
    resolves ambiguous cases; a hierarchy stack tracks nesting.
  - Never silently drop content. Anything that can't be classified
    confidently is attached as a continuation and flagged, not discarded.
  - Never hard-crash the pipeline. Document-level failures are caught,
    logged, and reported as a failed run — not an unhandled exception
    that takes the orchestrator down with it.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional


# --------------------------------------------------------------------------
# 1. Line classification patterns
# --------------------------------------------------------------------------

class LineType(str, Enum):
    CHAPTER = "chapter"
    SECTION_HEADING = "section_heading"
    CLAUSE = "clause"
    SUB_ITEM = "sub_item"
    ANNEXURE_MARKER = "annexure_marker"
    TABLE_ROW = "table_row"
    CONTINUATION = "continuation"
    UNCLASSIFIED = "unclassified"
    BLANK = "blank"


# Chapter / Part markers, e.g. "Chapter 4", "PART III"
RE_CHAPTER = re.compile(r"^(Chapter|CHAPTER|Part|PART)\s+([IVXLCivxlc\d]+)\b\.?\s*(.*)$")

# Single-level numbered heading with no sentence-ending punctuation,
# e.g. "4. Risk Management"  (heading, not an obligation clause)
RE_SECTION_HEADING = re.compile(r"^(\d+)\.\s+([A-Z][A-Za-z0-9 ,&/\-]{2,60})$")

# Multi-level decimal clause numbering, e.g. "4.1", "4.1.1", "4.1.1.2"
RE_CLAUSE = re.compile(r"^(\d+(?:\.\d+){1,})\s+(.*)$")

# Single-level numbered clause that IS a full sentence (ends in . ; :),
# distinguishes "4. Risk Management" (heading) from "4. Every broker shall..."
RE_TOP_LEVEL_CLAUSE = re.compile(r"^(\d+)\.\s+(.*[.;:])\s*$")

# Sub-items: (a), (b), (i), (ii), (iv) ...
RE_SUB_ITEM = re.compile(r"^\(([a-z]|[ivxlc]+)\)\s+(.*)$")

# Annexures / Schedules
RE_ANNEXURE = re.compile(r"^(Annexure|ANNEXURE|Schedule|SCHEDULE)[\s\-]+([A-Za-z0-9]+)\b\.?\s*(.*)$")

# Heuristic table-row detector: multiple runs of 2+ spaces (column gaps)
# and at least one numeric/short token — a stand-in for real layout-grid
# detection, which in production reads bounding boxes from the Ingestion
# Agent's layout_blocks instead of guessing from whitespace.
RE_TABLE_LIKE = re.compile(r"(\S+)(\s{2,})(\S+)(\s{2,})(\S+)")

# Common OCR confusions worth normalizing before pattern matching.
OCR_FIXES = [
    (re.compile(r"(?<=\d),(?=\d)"), "."),          # "4,1" -> "4.1"
    (re.compile(r"(?<=\d)l(?=\d)"), "1"),           # "4l1" -> "4.1" adjacent digit OCR slip
    (re.compile(r"^\((l|I)\)"), "(i)"),             # "(l)" / "(I)" -> "(i)" roman numeral slip
]


def normalize_ocr(line: str) -> str:
    fixed = line
    for pattern, repl in OCR_FIXES:
        fixed = pattern.sub(repl, fixed)
    return fixed


# --------------------------------------------------------------------------
# 2. Data model
# --------------------------------------------------------------------------

@dataclass
class Clause:
    clause_id: str
    circular_id: str
    segmentation_run_id: str

    number: str
    path: list = field(default_factory=list)
    parent_clause_id: Optional[str] = None
    ancestor_ids: list = field(default_factory=list)
    depth: int = 0

    clause_type: str = "clause"          # clause | sub_clause | heading | annexure_marker | table_row
    section_title: Optional[str] = None

    text: str = ""
    raw_lines: list = field(default_factory=list)

    page_range: list = field(default_factory=list)
    bounding_boxes: list = field(default_factory=list)

    segmentation_confidence: int = 100
    anomaly_flags: list = field(default_factory=list)

    is_table: bool = False
    is_annexure: bool = False

    status: str = "segmented"           # segmented | needs_review | reprocessed

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SegmentationRun:
    run_id: str
    circular_id: str
    parser_version: str = "0.1.0"
    total_lines_processed: int = 0
    total_clauses_produced: int = 0
    anomalies: list = field(default_factory=list)
    status: str = "completed"           # completed | completed_with_anomalies | failed
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


# --------------------------------------------------------------------------
# 3. Hierarchy stack entry
# --------------------------------------------------------------------------

@dataclass
class _StackEntry:
    depth: int
    clause_id: str
    number: str


# --------------------------------------------------------------------------
# 4. The agent
# --------------------------------------------------------------------------

class ClauseSegmentationAgent:
    """
    Usage:
        agent = ClauseSegmentationAgent()
        result = agent.run(circular_id="circ-123", pages=[{"page_num": 1, "text": "...", "layout_blocks": None}, ...])
        # result.clauses -> list[Clause]
        # result.run -> SegmentationRun
        # result.handoff -> dict (thin message for the Extraction Agent)
    """

    PARSER_VERSION = "0.1.0"

    def run(self, circular_id: str, pages: list[dict]) -> "SegmentationResult":
        run_id = str(uuid.uuid4())
        run_summary = SegmentationRun(run_id=run_id, circular_id=circular_id, parser_version=self.PARSER_VERSION)

        try:
            clauses = self._parse(circular_id, run_id, pages, run_summary)
        except Exception as exc:  # noqa: BLE001 — deliberate: never let this crash the orchestrator
            run_summary.status = "failed"
            run_summary.error = f"{type(exc).__name__}: {exc}"
            return SegmentationResult(clauses=[], run=run_summary, handoff=self._failed_handoff(circular_id, run_id))

        run_summary.total_clauses_produced = len(clauses)
        run_summary.status = "completed_with_anomalies" if run_summary.anomalies else "completed"

        handoff = self._build_handoff(circular_id, run_id, clauses)
        return SegmentationResult(clauses=clauses, run=run_summary, handoff=handoff)

    # ---- internal parsing -------------------------------------------------

    def _parse(self, circular_id: str, run_id: str, pages: list[dict], run_summary: SegmentationRun) -> list[Clause]:
        clauses: list[Clause] = []
        stack: list[_StackEntry] = []
        current_section_title: Optional[str] = None
        current_clause: Optional[Clause] = None
        last_seen_number_parts: Optional[list[int]] = None
        line_count = 0

        for page in pages:
            page_num = page.get("page_num")
            lines = [ln for ln in page.get("text", "").split("\n")]
            layout_blocks = page.get("layout_blocks") or [{}] * len(lines)

            for raw_line, _layout in zip(lines, layout_blocks):
                line_count += 1
                line = raw_line.strip()
                if not line:
                    continue

                line = normalize_ocr(line)
                line_type, parsed = self._classify_line(line)

                if line_type is LineType.CHAPTER:
                    stack = []  # chapter reset closes everything below it
                    current_clause = None
                    current_section_title = None
                    continue  # chapters are structural markers, not addressable "clauses" here

                elif line_type is LineType.SECTION_HEADING:
                    current_section_title = parsed["title"]
                    current_clause = None
                    continue

                elif line_type is LineType.ANNEXURE_MARKER:
                    c = self._new_clause(circular_id, run_id, parsed["number"], parsed.get("rest", ""),
                                          clause_type="annexure_marker", is_annexure=True,
                                          section_title=current_section_title, page_num=page_num)
                    clauses.append(c)
                    current_clause = c
                    stack = [_StackEntry(depth=0, clause_id=c.clause_id, number=c.number)]
                    continue

                elif line_type is LineType.TABLE_ROW:
                    if current_clause is not None and current_clause.clause_type in ("annexure_marker", "table_row"):
                        current_clause.raw_lines.append(line)
                        current_clause.text += "\n" + line
                        current_clause.is_table = True
                    else:
                        c = self._new_clause(circular_id, run_id, number=f"table@{page_num}:{line_count}",
                                              text=line, clause_type="table_row", is_table=True,
                                              section_title=current_section_title, page_num=page_num)
                        clauses.append(c)
                        current_clause = c
                    continue

                elif line_type in (LineType.CLAUSE, LineType.SUB_ITEM):
                    number = parsed["number"]
                    text = parsed["text"]

                    if line_type is LineType.SUB_ITEM:
                        # sub-items nest one level below whatever is currently open
                        depth = (stack[-1].depth + 1) if stack else 1
                    else:
                        depth = self._depth_of(number, line_type)
                        # numbering continuity check (only meaningful for decimal clause numbers)
                        anomaly = self._check_continuity(number, last_seen_number_parts, line_type)
                        last_seen_number_parts = self._number_parts(number)

                    if line_type is LineType.SUB_ITEM:
                        anomaly = None

                    # pop stack to correct depth (closes deeper open sub-clauses)
                    stack = [e for e in stack if e.depth < depth]
                    parent = stack[-1] if stack else None

                    c = self._new_clause(
                        circular_id, run_id, number, text,
                        clause_type=("sub_clause" if line_type is LineType.SUB_ITEM else "clause"),
                        parent_clause_id=parent.clause_id if parent else None,
                        depth=depth,
                        section_title=current_section_title,
                        page_num=page_num,
                    )
                    if parent:
                        c.ancestor_ids = self._ancestor_chain(clauses, parent.clause_id) + [parent.clause_id]
                        c.path = self._path_for(clauses, parent.clause_id) + [c.number]
                    else:
                        c.path = [c.number]

                    if anomaly:
                        c.anomaly_flags.append(anomaly)
                        c.segmentation_confidence -= 20
                        c.status = "needs_review"
                        run_summary.anomalies.append({"type": anomaly, "clause_number": number, "page": page_num})

                    clauses.append(c)
                    current_clause = c
                    stack.append(_StackEntry(depth=depth, clause_id=c.clause_id, number=c.number))
                    continue

                else:
                    # CONTINUATION or UNCLASSIFIED — attach to currently open clause
                    if current_clause is not None:
                        current_clause.raw_lines.append(line)
                        current_clause.text = (current_clause.text + " " + line).strip()
                        if line_type is LineType.UNCLASSIFIED:
                            if "unclassified_line" not in current_clause.anomaly_flags:
                                current_clause.anomaly_flags.append("unclassified_line")
                                current_clause.segmentation_confidence = max(30, current_clause.segmentation_confidence - 10)
                    else:
                        # no open clause to attach to — orphaned line, flagged at run level
                        run_summary.anomalies.append({"type": "orphaned_line", "text": line[:80], "page": page_num})
                    continue

        # post-pass: flag long/compound clauses and cross-references
        for c in clauses:
            self._post_flag(c)

        run_summary.total_lines_processed = line_count
        return clauses

    # ---- line classification ----------------------------------------------

    def _classify_line(self, line: str) -> tuple[LineType, dict]:
        m = RE_CHAPTER.match(line)
        if m:
            return LineType.CHAPTER, {"number": m.group(2), "title": m.group(3)}

        m = RE_ANNEXURE.match(line)
        if m:
            return LineType.ANNEXURE_MARKER, {"number": f"{m.group(1)} {m.group(2)}", "rest": m.group(3)}

        m = RE_CLAUSE.match(line)
        if m:
            return LineType.CLAUSE, {"number": m.group(1), "text": m.group(2)}

        m = RE_TOP_LEVEL_CLAUSE.match(line)
        if m:
            return LineType.CLAUSE, {"number": m.group(1), "text": m.group(2)}

        m = RE_SECTION_HEADING.match(line)
        if m:
            return LineType.SECTION_HEADING, {"number": m.group(1), "title": m.group(2)}

        m = RE_SUB_ITEM.match(line)
        if m:
            return LineType.SUB_ITEM, {"number": f"({m.group(1)})", "text": m.group(2)}

        if RE_TABLE_LIKE.search(line):
            return LineType.TABLE_ROW, {}

        # heuristic: looks like prose continuation (lowercase start, or long line)
        if line[0].islower() or len(line.split()) > 3:
            return LineType.CONTINUATION, {}

        return LineType.UNCLASSIFIED, {}

    # ---- helpers ------------------------------------------------------------

    def _new_clause(self, circular_id, run_id, number, text, clause_type="clause",
                     parent_clause_id=None, depth=0, section_title=None, page_num=None,
                     is_table=False, is_annexure=False) -> Clause:
        return Clause(
            clause_id=str(uuid.uuid4()),
            circular_id=circular_id,
            segmentation_run_id=run_id,
            number=number,
            text=text,
            raw_lines=[text] if text else [],
            clause_type=clause_type,
            parent_clause_id=parent_clause_id,
            depth=depth,
            section_title=section_title,
            page_range=[page_num, page_num] if page_num is not None else [],
            is_table=is_table,
            is_annexure=is_annexure,
        )

    @staticmethod
    def _number_parts(number: str) -> list[int]:
        try:
            return [int(p) for p in number.split(".")]
        except ValueError:
            return []

    def _depth_of(self, number: str, line_type: LineType) -> int:
        if line_type is LineType.SUB_ITEM:
            return 99  # placeholder; corrected relative to parent depth below in caller if needed
        parts = self._number_parts(number)
        return len(parts) if parts else 1

    def _check_continuity(self, number: str, last_parts: Optional[list[int]], line_type: LineType) -> Optional[str]:
        if line_type is not LineType.CLAUSE:
            return None
        parts = self._number_parts(number)
        if not parts or not last_parts:
            return None
        if len(parts) == len(last_parts) and parts[:-1] == last_parts[:-1]:
            if parts[-1] == last_parts[-1]:
                return "duplicate_number"
            if parts[-1] != last_parts[-1] + 1 and parts[-1] > last_parts[-1]:
                return "non_sequential_numbering"
        return None

    def _ancestor_chain(self, clauses: list[Clause], parent_id: str) -> list[str]:
        for c in clauses:
            if c.clause_id == parent_id:
                return list(c.ancestor_ids)
        return []

    def _path_for(self, clauses: list[Clause], parent_id: str) -> list[str]:
        for c in clauses:
            if c.clause_id == parent_id:
                return list(c.path)
        return []

    def _post_flag(self, c: Clause) -> None:
        word_count = len(c.text.split())
        if word_count > 55:
            c.anomaly_flags.append("long_clause_possible_compound")
            c.segmentation_confidence = min(c.segmentation_confidence, 75)
        if re.search(r"(read with|Annexure|as amended from time to time|applicable framework)", c.text, re.I):
            c.anomaly_flags.append("cross_reference_detected")
        if c.status != "needs_review" and c.segmentation_confidence < 70:
            c.status = "needs_review"

    def _build_handoff(self, circular_id: str, run_id: str, clauses: list[Clause]) -> dict:
        clause_ids = [c.clause_id for c in clauses if c.clause_type not in ("table_row", "annexure_marker")]
        needs_review = [c.clause_id for c in clauses if c.status == "needs_review"]
        tables = [c.clause_id for c in clauses if c.is_table]
        annexures = [c.clause_id for c in clauses if c.is_annexure]
        anomaly_types = {}
        for c in clauses:
            for f in c.anomaly_flags:
                anomaly_types[f] = anomaly_types.get(f, 0) + 1
        return {
            "circular_id": circular_id,
            "segmentation_run_id": run_id,
            "clause_ids": clause_ids,
            "needs_review_clause_ids": needs_review,
            "excluded_ids": {"tables": tables, "annexures": annexures},
            "anomalies_summary": {"count": sum(anomaly_types.values()), "types": anomaly_types},
        }

    def _failed_handoff(self, circular_id: str, run_id: str) -> dict:
        return {
            "circular_id": circular_id,
            "segmentation_run_id": run_id,
            "clause_ids": [],
            "needs_review_clause_ids": [],
            "excluded_ids": {"tables": [], "annexures": []},
            "anomalies_summary": {"count": 0, "types": {}},
            "status": "failed",
        }


@dataclass
class SegmentationResult:
    clauses: list[Clause]
    run: SegmentationRun
    handoff: dict
