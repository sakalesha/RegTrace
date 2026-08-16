import re
import logging
from typing import List, Optional
from datetime import datetime

from app.agents.base_agent import BaseAgent
from app.schemas.clause import ClauseSegmentationInput, ClauseSegmentationOutput, ClauseSchema
from app.schemas.document import DocumentStatus
from app.models.clause import ClauseModel
from app.db.mongodb import db
from app.services.clause_service import ClauseService

logger = logging.getLogger("pipeline.segment")

OBLIGATION_KEYWORDS = [
    r"\bshall\b",
    r"\bmust\b",
    r"\brequired to\b",
    r"\bwithin \w+ days\b",
    r"\bimmediately\b",
]

NEGATIVE_KEYWORDS = [
    r"\bshall be eligible\b",
    r"\bshall not be entitled\b",
    r"\bshall be deemed\b",
    r"\bshall continue as\b",
    r"\bshall be granted\b",
    r"\bshall have been\b",
    r"\bshall include\b",
    r"\bshall mean\b",
]


class ClauseSegmentationAgent(BaseAgent):
    """
    The Clause Segmentation Agent processes a parsed document into structured legal clauses.

    Uses a stack-based hierarchical parser that recognises multi-level numbering forms
    (I., 1., 1.1, 4.2.1(a), (a), (i), (1), a., i.) and propagates descriptive headings
    from a clause down to its descendants. Structure (chapters, annexures, schedules) is
    tracked so every clause records its chapter, parent section and hierarchy level.
    """

    # Matches "CHAPTER IV", "Chapter 4"
    CHAPTER_PATTERN = re.compile(r'^(?:CHAPTER|Chapter)\s+([IVXLCDM\d]+)[\.\:\-]?\s*(.*)$', re.IGNORECASE)

    # Top-level roman chapter lines like "I. Registration of Stock Brokers",
    # also a lone "I." when the title follows on its own line.
    ROMAN_CHAPTER_PATTERN = re.compile(r'^([IVXLCDM]{1,4})[\.\:]\s*(.*)$')

    # Matches "Annexure A", "Annexure 1" and "Schedule I". The identifier is
    # case-sensitive digits or a single capital letter so that mid-sentence
    # references like "annexure to PoA." or "Annexure-6 of this Framework"
    # are not treated as headings.
    ANNEXURE_PATTERN = re.compile(r'^(Annexure[-\s]*\d+[A-Z]?|Annexure[-\s]*[A-Z])\b[\.\:\-]?\s*(.*)$')
    SCHEDULE_PATTERN = re.compile(r'^(Schedule[-\s]?[IVXLCDM\d]+)[\.\:\-]?\s*(.*)$', re.IGNORECASE)

    # Full coordinate: "23", "23A", "23.1", "23.1.1", "23.1.1(a)", "23.1(a)(i)"
    # Dotted arabic prefix, optionally followed by parenthesised tokens.
    SECTION_PATTERN = re.compile(
        r'^(?P<num>\d+[A-Z]?(?:\.\d+[A-Z]?)*)'
        r'(?P<par>(?:\([a-zivx\d]+\))*)'
        r'[\.\:\-]?\s+(?P<rest>.*)$',
        re.IGNORECASE,
    )

    # Bare bullets on their own line: "(a)", "(i)", "(1)", "a.", "A.", "i.", "ii."
    SUB_SECTION_PATTERN = re.compile(
        r'^(?P<tok>\((?:(?:[ivxlcdm]{1,4})|[a-zA-Z]|\d{1,2})\)|(?:[ivxlcdm]{1,3}|[a-zA-Z])\.)\s+(?P<rest>.*)$',
        re.IGNORECASE,
    )

    # Matches references like "Regulation 17", "Schedule I", "Annexure A", "Circular dated..."
    REF_PATTERN = re.compile(r'(Regulation\s+\d+|Schedule\s+[IVXLCDM]+|Circular\s+dated\s+[\w\s\d]+)', re.IGNORECASE)
    ANNEXURE_REF_PATTERN = re.compile(r'(Annexure[-\s]?[A-Z0-9]+|Table\s+\d+)', re.IGNORECASE)

    # Structure blocks never become clauses themselves, but act as parents in the tree.
    _STRUCTURE_TYPES = ("chapter", "annexure", "schedule")

    # Relative depth of bullet families: alpha < roman < numeric, e.g.
    # (a) -> (i) -> (1). A bullet is a child when its family is deeper than the
    # top of the stack, otherwise it is a sibling of the previous bullet.
    _BULLET_FAMILY_RANK = {"alpha": 1, "roman": 2, "numeric": 3}

    @staticmethod
    def _bullet_family(tok: str) -> str:
        inner = tok.strip("()").lower()
        if inner.isdigit():
            return "numeric"
        # A single letter is an alpha bullet unless it is a common roman
        # numeral used as a sub-bullet (i, v, x). Multi-letter strings like
        # "ii", "iii", "iv" are roman.
        if len(inner) == 1:
            return "roman" if inner in "ivx" else "alpha"
        if re.fullmatch(r"[ivxlcdm]+", inner):
            return "roman"
        return "alpha"

    async def validate(self, input_data: ClauseSegmentationInput):
        database = db.get_db()
        document = await database["documents"].find_one({"document_id": input_data.document_id})
        if not document:
            raise ValueError(f"Document {input_data.document_id} not found.")

        status = document.get("processing_status")
        # Accept PARSED, CHUNKED, or EMBEDDED as per pipeline rules
        valid_statuses = [
            DocumentStatus.PARSED.value,
            DocumentStatus.CHUNKED.value,
            DocumentStatus.EMBEDDED.value,
            DocumentStatus.CLAUSES_CREATED.value,  # In case of re-run
        ]
        if status not in valid_statuses:
            raise ValueError(
                f"Document must be in PARSED, CHUNKED or EMBEDDED status to segment clauses. Current status: {status}"
            )

    async def process(self, input_data: ClauseSegmentationInput) -> ClauseSegmentationOutput:
        logger.info("=== CLAUSE-SEGMENTATION START   doc=%s", input_data.document_id)
        database = db.get_db()
        document = await database["documents"].find_one({"document_id": input_data.document_id})
        pages = document.get("pages", [])

        clauses: List[ClauseSchema] = []
        used_ids = set()

        obligation_pattern = re.compile("|".join(OBLIGATION_KEYWORDS), re.IGNORECASE)
        negative_pattern = re.compile("|".join(NEGATIVE_KEYWORDS), re.IGNORECASE)

        # Open hierarchy nodes: each is a dict with keys
        # level, section, heading, inherited_heading, chapter, chapter_title, type
        stack = []

        # Current clause accumulator
        acc = {}
        acc_lines: List[str] = []
        global_line_idx = 0

        def extract_references(text: str):
            refs = list(set(self.REF_PATTERN.findall(text)))
            annexures = list(set(self.ANNEXURE_REF_PATTERN.findall(text)))
            return refs, annexures

        def make_clause_id(section: str) -> str:
            base = f"{input_data.document_id}_{section}"
            candidate = base
            n = 2
            while candidate in used_ids:
                candidate = f"{base}#{n}"
                n += 1
            used_ids.add(candidate)
            return candidate

        def flush(end_line: int):
            nonlocal acc_lines
            if acc and acc_lines:
                text = " ".join(acc_lines).strip()
                if text:
                    refs, annex_refs = extract_references(text)
                    has_obs = bool(obligation_pattern.search(text))
                    if has_obs and bool(negative_pattern.search(text)):
                        has_obs = False
                    clauses.append(ClauseSchema(
                        clause_id=make_clause_id(acc["section"]),
                        document_id=input_data.document_id,
                        chapter=acc["chapter"],
                        chapter_title=acc["chapter_title"],
                        section_number=acc["section"],
                        parent_section=acc["parent"],
                        heading=acc["heading"],
                        title=acc["title"],
                        clause_type=acc["type"],
                        hierarchy_level=acc["level"],
                        start_line=acc["start"],
                        end_line=end_line,
                        text=text,
                        page_number=acc["page"],
                        has_obligations=has_obs,
                        references=refs,
                        annexure_refs=annex_refs,
                    ))
            acc_lines = []

        def pop_to_parent(level: int):
            """Pop deeper/equal levels so the top of the stack is the parent of level."""
            nonlocal stack
            while stack and stack[-1]["level"] >= level:
                stack.pop()
            return stack[-1] if stack else None

        def build_node(parent, level: int, section: str, heading: Optional[str], type_: str):
            """Resolve chapter/title context and push a new open node."""
            nonlocal stack
            own_heading = heading or None
            inherited = parent["inherited_heading"] if parent else None

            if type_ in self._STRUCTURE_TYPES:
                chapter = section
                chapter_title = own_heading
            else:
                chapter = parent["chapter"] if parent else None
                chapter_title = parent["chapter_title"] if parent else None

            stack.append({
                "level": level,
                "section": section,
                "heading": own_heading,
                "inherited_heading": own_heading or inherited,
                "chapter": chapter,
                "chapter_title": chapter_title,
                "type": type_,
            })

        def begin_clause(parent, section: str, heading: Optional[str], type_: str, page: int, level: int):
            """Start a new clause record under the given parent stack node."""
            nonlocal acc, acc_lines
            flush(global_line_idx - 1)

            own_heading = heading or None
            inherited = parent["inherited_heading"] if parent else None

            acc = {
                "section": section,
                "parent": parent["section"] if parent else None,
                "heading": own_heading,
                "title": own_heading or inherited,
                "chapter": parent["chapter"] if parent else None,
                "chapter_title": parent["chapter_title"] if parent else None,
                "type": type_,
                "level": level,
                "page": page,
                "start": global_line_idx,
            }
            acc_lines = []
            if own_heading:
                acc_lines.append(own_heading)

        def open_section(level: int, section: str, heading: Optional[str], type_: str, page: int):
            parent = pop_to_parent(level)
            build_node(parent, level, section, heading, type_)
            begin_clause(parent, section, heading, type_, page, level)

        def open_structure(section: str, heading: Optional[str], type_: str, page: int):
            nonlocal acc, acc_lines
            flush(global_line_idx - 1)
            acc = {}
            acc_lines = []
            parent = pop_to_parent(0)
            build_node(parent, 0, section, heading, type_)

        def open_bullet(tok: str, heading: Optional[str], page: int, x0: Optional[float] = None):
            """Open a bullet such as (a), (i) or a. under the current context.

            Bullets form their own family stack: a deeper family (e.g. (i) under
            (a)) is pushed as a child, while the same or a shallower family is a
            sibling and replaces the previous bullet. When the family is equal,
            visual indentation is used as a tiebreaker (deeper x0 => child).
            """
            nonlocal stack
            normalized = f"({tok.rstrip('.')})" if tok.endswith(".") else tok
            family = self._bullet_family(normalized)
            rank = self._BULLET_FAMILY_RANK[family]

            parent = None
            while stack and stack[-1]["type"] == "clause":
                top_family = stack[-1].get("family")
                if top_family and self._BULLET_FAMILY_RANK[top_family] < rank:
                    parent = stack[-1]
                    break
                if top_family and self._BULLET_FAMILY_RANK[top_family] == rank:
                    # Same family: use indentation to decide child vs sibling.
                    top_x0 = stack[-1].get("x0")
                    if x0 is not None and top_x0 is not None and x0 > top_x0 + 5.0:
                        parent = stack[-1]
                        break
                stack.pop()
            if parent is None:
                parent = stack[-1] if stack else None
                if parent is None or parent["level"] < 1:
                    return

            section = parent["section"] + normalized
            level = parent["level"] + 1
            node = {
                "level": level,
                "section": section,
                "heading": heading or None,
                "inherited_heading": heading or parent["inherited_heading"],
                "chapter": parent["chapter"],
                "chapter_title": parent["chapter_title"],
                "type": "clause",
                "family": family,
                "x0": x0,
            }
            stack.append(node)
            begin_clause(parent, section, heading, level=level, page=page, type_="clause")

        # Compute a body font-size baseline across the document so that larger
        # lines can be recognised as headings even without numbering.
        all_sizes = []
        for page in pages:
            for block in page.get("blocks", []):
                if block.get("size"):
                    all_sizes.append(block["size"])
        import statistics
        body_size = statistics.median(all_sizes) if len(all_sizes) >= 5 else 0.0

        def line_iter():
            """Yield (text, x0, size, bold) per logical line, preferring blocks."""
            for page in pages:
                page_num = page.get("page_number", 1)
                blocks = page.get("blocks") or []
                if blocks:
                    for b in blocks:
                        text = (b.get("text") or "").strip()
                        if not text:
                            continue
                        yield text, b.get("x0"), b.get("size") or 0.0, b.get("bold"), page_num
                else:
                    for raw in page.get("text", "").split("\n"):
                        text = raw.strip()
                        if not text:
                            continue
                        yield text, None, 0.0, False, page_num

        def heading_candidate(text: str, size: float, bold: bool) -> bool:
            """True if an unnumbered line looks like a heading by style alone."""
            if not text or len(text) > 100:
                return False
            if bold:
                return True
            return body_size > 0 and size > body_size + 1.0

        # Materialise all logical lines so the parser can look ahead (e.g. to
        # detect table-of-contents entries, whose headings are immediately
        # followed by a right-aligned page number).
        all_lines = list(line_iter())
        page_num_re = re.compile(r'^\d{1,3}$')

        # Table-of-contents pages carry a dense column of right-aligned page
        # numbers. Wrapped TOC headings are split into many tiny blocks, so a
        # per-line lookahead cannot reliably see the page number; instead, whole
        # TOC pages are skipped. Detection uses a per-page right-margin column:
        # a page is a TOC page when a single x0 column near its right edge holds
        # many bare numbers. The margin is computed relative to the page's own
        # rightmost block so it works across page widths, and the count is per
        # column (not per page) so annexure reference/collateral tables whose
        # numbers spread across several columns are not mistaken for a TOC.
        page_max_x0 = {}
        for page in pages:
            max_x0 = 0.0
            for block in page.get("blocks") or []:
                bx0 = block.get("x0")
                if bx0:
                    max_x0 = max(max_x0, bx0)
            page_max_x0[page.get("page_number", 1)] = max_x0

        toc_pages = set()
        for page in pages:
            pn = page.get("page_number", 1)
            max_x0 = page_max_x0.get(pn, 0.0)
            if max_x0 <= 0.0:
                continue
            right_margin = 0.7 * max_x0
            col_counts = {}
            for block in page.get("blocks") or []:
                btext = (block.get("text") or "").strip()
                bx0 = block.get("x0")
                if bx0 and bx0 > right_margin and page_num_re.fullmatch(btext):
                    col = round(bx0)
                    col_counts[col] = col_counts.get(col, 0) + 1
            if col_counts and max(col_counts.values()) >= 10:
                toc_pages.add(pn)

        # Expose detection results for post-run assertions (e.g. the harness
        # verifying no clause leaks out of a TOC page).
        self._last_toc_pages = toc_pages
        self._last_page_max_x0 = page_max_x0

        def is_toc_entry(i: int) -> bool:
            """True if line i is a TOC heading.

            In the table of contents every numbered heading is followed within a
            few lines by a right-aligned page number near the right margin of
            its page. Wrapped headings interleave continuation lines at a deeper
            indent, so the scan looks up to 4 lines ahead for a bare number
            placed beyond the page's right-margin column.

            The threshold scales with the page's rightmost block but never drops
            below an absolute floor: page-footer numbers are centred (~295 on an
            A4 page) and must never qualify, while TOC numbers sit near the right
            edge (~519).
            """
            right_margin = max(0.7 * page_max_x0.get(page_num, 0.0), 400.0)
            for j in range(i + 1, min(i + 5, len(all_lines))):
                nxt_text, nxt_x0, *_ = all_lines[j]
                if not nxt_text:
                    continue
                if page_num_re.fullmatch(nxt_text):
                    return nxt_x0 is not None and nxt_x0 > right_margin
                if self.SECTION_PATTERN.match(nxt_text):
                    return False
            return False

        for i, (text, x0, size, bold, page_num) in enumerate(all_lines):
            if page_num in toc_pages:
                continue
            global_line_idx += 1

            # --- Structure blocks -------------------------------------------------
            chap_match = self.CHAPTER_PATTERN.match(text)
            if chap_match:
                # "Chapter VII of SEBI (Stock Brokers) Regulations ..." appears in
                # body prose as a mid-sentence reference, not a heading. Only open
                # a chapter when the line actually looks like a heading.
                if not heading_candidate(text, size, bold) and body_size > 0:
                    if stack:
                        acc_lines.append(text)
                    continue
                open_structure(chap_match.group(1).strip(), chap_match.group(2) or None, "chapter", page_num)
                continue

            # Roman chapter lines ("I. Title" or a lone bold "I."). Body sentences
            # that start with roman-like tokens ("CM. The CM, after doing its
            # internal exposure and risk management ...") are long, non-bold
            # prose and must not be mistaken for chapters.
            roman_match = self.ROMAN_CHAPTER_PATTERN.match(text)
            if roman_match:
                roman_rest = roman_match.group(2)
                layout_known = body_size > 0
                in_annexure = bool(stack) and stack[-1]["type"] in ("annexure", "schedule")
                if layout_known:
                    # Real chapters are bold (or larger than body font). TOC
                    # entries are bold too but carry a page number on the next
                    # line, so they are rejected below.
                    looks_like_heading = heading_candidate(text, size, bold)
                else:
                    looks_like_heading = bool(roman_rest)
                if looks_like_heading and not in_annexure and not is_toc_entry(i):
                    open_structure(roman_match.group(1).strip(), roman_rest or None, "chapter", page_num)
                    continue

            annexure_match = self.ANNEXURE_PATTERN.match(text)
            if annexure_match:
                # Mid-sentence references ("Annexure-6 of this Framework ...")
                # are set in body font, not bold. Only open structure when the
                # line actually looks like a heading.
                if not heading_candidate(text, size, bold) and body_size > 0:
                    if stack:
                        acc_lines.append(text)
                    continue
                open_structure(annexure_match.group(1).strip(), annexure_match.group(2) or None, "annexure", page_num)
                continue

            schedule_match = self.SCHEDULE_PATTERN.match(text)
            if schedule_match:
                if not heading_candidate(text, size, bold) and body_size > 0:
                    if stack:
                        acc_lines.append(text)
                    continue
                open_structure(schedule_match.group(1).strip(), schedule_match.group(2) or None, "schedule", page_num)
                continue

            # --- Lone numbered heading like "20." / "60." with title on the next
            # line. Table cells ("1." inside S.No. columns) are shallowly indented
            # or part of a table, so require heading style and page-left placement.
            # Multi-level bare headings ("36.10.") are never table cells or page
            # footers, so they are accepted without a style requirement; this
            # captures headings whose title is split into a separate block by a
            # font change ("36.10." + bold title on the same visual line).
            lone_match = re.fullmatch(r'(?P<num>\d+[A-Z]?(?:\.\d+[A-Z]?)*)\.[\s]*', text)
            if lone_match and (heading_candidate(text, size, bold) or "." in lone_match.group("num")):
                level = len(lone_match.group("num").split("."))
                type_ = "section" if level == 1 else "subsection"
                parent = pop_to_parent(level)
                build_node(parent, level, lone_match.group("num"), None, type_)
                begin_clause(parent, lone_match.group("num"), None, type_, page_num, level)
                continue

            # --- Explicit numbered section like "23.1 Some title" ------------------
            sec_match = self.SECTION_PATTERN.match(text)
            if sec_match:
                num = sec_match.group("num")
                paren = sec_match.group("par") or ""
                rest = sec_match.group("rest")

                # Guard against false positives such as "5 or more days".
                next_char = text[len(num):len(num) + 1]
                has_heading_indicator = next_char in ".:-(" or bool(paren) or (rest and rest[0].isupper())
                if not has_heading_indicator:
                    if stack:
                        acc_lines.append(text)
                    continue

                # Skip table-of-contents entries: in the TOC every numbered
                # heading is immediately followed by a bare page number line.
                if is_toc_entry(i):
                    continue

                # Skip footnotes ("1 Reference: Circular ...") which are set in a
                # smaller font than the body, and table row markers ("2. 2", whose
                # heading begins with a digit). When layout is known these are not
                # headings; fall back to plain text otherwise. Footnote text is set
                # well below the body size (10pt vs 12pt), while annexure table
                # content sits just below body (11pt) and must be kept.
                if body_size > 0 and (size < body_size - 1.5 or (rest and rest[0].isdigit())):
                    if stack:
                        acc_lines.append(text)
                    continue

                # Skip annexure reference-table rows whose heading is a circular
                # reference ("SEBI/HO/...", "CIR/...", "Email dated ...") rather
                # than a descriptive title.
                if rest and re.match(r'^(?:SEBI\s*/\s*HO|SEBI letter|CIR\s*/\s*HO|CIR\s*/\s*MIRSD|FMC[^a-zA-Z]|Email dated)', rest, re.IGNORECASE):
                    if stack:
                        acc_lines.append(text)
                    continue

                # Body sections ("1.", "12.") are bold; a wrapped continuation
                # line deep-indented to the left margin ("100. Similarly, ...")
                # is not a heading even though it starts with a number. Annexure
                # sections are often non-bold, so only guard the body chapters.
                in_annexure = bool(stack) and stack[-1]["type"] in ("annexure", "schedule")
                if len(num.split(".")) == 1 and body_size > 0 and not in_annexure and not heading_candidate(text, size, bold):
                    if stack:
                        acc_lines.append(text)
                    continue

                # Open the dotted coordinate as a section/subsection node.
                level = len(num.split("."))
                type_ = "section" if level == 1 else "subsection"
                parent = pop_to_parent(level)
                # When parens follow, the trailing text belongs to the last
                # bullet; otherwise it is this section's own heading.
                section_heading = rest if not paren else None
                build_node(parent, level, num, section_heading, type_)
                begin_clause(parent, num, section_heading, type_, page_num, level)

                # Any trailing parens become bullets under that node, e.g.
                # "4.2.1(a)" -> section "4.2.1" + bullet "(a)".
                if paren:
                    tokens = re.findall(r"\([a-zivx\d]+\)", paren, re.IGNORECASE)
                    for i, tok in enumerate(tokens):
                        bullet_rest = rest if i == len(tokens) - 1 else None
                        open_bullet(tok, bullet_rest, page_num, x0)
                continue

            # --- Bare bullet like "(a)", "a.", "(i)" ------------------------------
            sub_match = self.SUB_SECTION_PATTERN.match(text)
            if sub_match and stack and stack[-1]["level"] >= 1:
                tok = sub_match.group("tok")
                rest = sub_match.group("rest")
                open_bullet(tok, rest, page_num, x0)
                continue

            # --- Unnumbered heading detected by style (bold / larger font) --------
            if heading_candidate(text, size, bold) and stack and stack[-1]["type"] in self._STRUCTURE_TYPES:
                # Fill the open structure node's heading when it is missing, e.g.
                # "I." followed by the bold chapter title on the next line.
                top = stack[-1]
                if not top.get("heading"):
                    top["heading"] = text
                    top["inherited_heading"] = text
                    if top["type"] == "chapter":
                        top["chapter_title"] = text
                elif top["type"] == "chapter" and top.get("chapter_title") is None:
                    top["chapter_title"] = text
                continue

            # --- Ordinary body line, append to the current clause ------------------
            if stack:
                top = stack[-1]
                if top["type"] not in self._STRUCTURE_TYPES:
                    if not acc:
                        acc["start"] = global_line_idx
                    acc_lines.append(text)
                else:
                    # Body prose directly under an open structure (annexure /
                    # schedule / chapter) with no numbered sub-sections: lazily
                    # begin an implicit clause so the prose is captured instead
                    # of dropped (e.g. Annexure-18..23 are prose/tables). The
                    # synthetic section number avoids colliding with real parent
                    # references (e.g. real section "1" under chapter "I").
                    if not acc:
                        synthetic = f"{top['section']}#body"
                        begin_clause(top, synthetic, None, "section", page_num, top["level"] + 1)
                    acc_lines.append(text)

        flush(global_line_idx)

        if not clauses:
            # Fallback: one clause per page
            for page in pages:
                clause_id = f"{input_data.document_id}_p{page.get('page_number', 1)}"
                text = page.get("text", "").strip()
                refs, annex_refs = extract_references(text)
                clauses.append(ClauseSchema(
                    clause_id=clause_id,
                    document_id=input_data.document_id,
                    text=text,
                    page_number=page.get("page_number", 1),
                    references=refs,
                    annexure_refs=annex_refs,
                ))

        output = ClauseSegmentationOutput(
            document_id=input_data.document_id,
            total_clauses=len(clauses),
            clauses=clauses,
            processing_status=DocumentStatus.CLAUSES_CREATED.value,
        )

        logger.info("=== CLAUSE-SEGMENTATION DONE   doc=%s | %d clauses (total %d pages)",
                    input_data.document_id, len(clauses), len(pages))
        return output

    async def validate_output(self, output_data: ClauseSegmentationOutput):
        if not output_data.clauses:
            raise ValueError("No clauses were generated.")

    async def persist(self, output_data: ClauseSegmentationOutput):
        # 0. Validate and repair clause structure before persisting
        from app.services.clause_validator import ClauseValidator
        repaired, findings = ClauseValidator.validate_and_repair(output_data.clauses)
        for severity, message in findings:
            if severity == "warn":
                logger.warning("clause-validator: %s", message)
            else:
                logger.error("clause-validator: %s", message)
        output_data.clauses = repaired
        output_data.total_clauses = len(repaired)

        # 1. Update Document status
        database = db.get_db()
        await database["documents"].update_one(
            {"document_id": output_data.document_id},
            {"$set": {"processing_status": output_data.processing_status}},
        )

        # 2. Clear old clauses for this doc
        await ClauseService.delete_clauses_by_document(output_data.document_id)

        # 3. Save new clauses
        models = [ClauseModel(**clause.dict()) for clause in output_data.clauses]
        await ClauseService.create_clauses(models)
        obligation_count = sum(1 for c in output_data.clauses if c.has_obligations)
        logger.info("Persisted %d clauses | %d flagged as obligation-bearing → starting obligation extraction",
                    len(models), obligation_count)

        # 4. Trigger Obligation Extraction Pipeline
        import asyncio
        from app.services.obligation_service import ObligationService
        asyncio.create_task(ObligationService().process_document_obligations(output_data.document_id))
