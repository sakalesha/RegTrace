import re
from typing import List, Tuple
from collections import defaultdict

from app.schemas.clause import ClauseSchema


class ClauseValidator:
    """
    Validates a list of extracted clauses and repairs structural issues before
    they are persisted. Checks performed:

    1. clause_id uniqueness (repairs collisions by suffixing #n)
    2. parent_section references exist (repairs by re-pointing to the nearest
       ancestor found in the list, otherwise None)
    3. hierarchy_level consistency (repairs level to match parent depth)
    4. numbering grammar (warn-only): a child section number must be a valid
       extension of its parent (1 -> 1.1, 1.1 -> 1.1.1, 1.1.1 -> 1.1.1(a),
       (a) -> (a)(i)); sibling numeric sections must not skip an integer
    5. sibling ordering (numbers within the same parent must appear in
       document order, which is guaranteed by construction, so only logged)
    6. headings: sections and subsections are expected to carry a heading;
       clauses that miss one are flagged (non-fatal)

    Returns a tuple of (repaired_clauses, findings) where findings is a list of
    (severity, message) tuples suitable for logging or surfacing to the UI.
    """

    SECTION_TYPES = ("section", "subsection", "clause")

    # A bullet token: single alpha letter, a roman numeral, or a 1-2 digit int.
    _BULLET_TOKEN = r"(?:[a-zA-Z]|[ivxlcdm]+|\d{1,2})"

    @classmethod
    def validate_and_repair(cls, clauses: List[ClauseSchema]) -> Tuple[List[ClauseSchema], List[Tuple[str, str]]]:
        findings: List[Tuple[str, str]] = []
        seen_ids = defaultdict(int)
        repaired = []

        # Map of section_number -> clause for parent resolution.
        by_section = {}
        for c in clauses:
            by_section.setdefault(c.section_number, c)

        for c in clauses:
            # 1. clause_id uniqueness
            base_id = c.clause_id
            dup_count = seen_ids[base_id]
            seen_ids[base_id] += 1
            if dup_count > 0:
                c.clause_id = f"{base_id}#{dup_count + 1}"
                findings.append(("repair", f"Duplicate clause_id '{base_id}' -> '{c.clause_id}'"))

            # 2. parent_section reference exists
            if c.parent_section:
                parent = by_section.get(c.parent_section)
                if parent is None:
                    # Attempt to find the nearest ancestor already emitted.
                    ancestor = cls._nearest_ancestor(c.parent_section, by_section)
                    old = c.parent_section
                    c.parent_section = ancestor.section_number if ancestor else None
                    findings.append((
                        "repair" if ancestor else "warn",
                        f"Clause '{c.section_number}' parent '{old}' not found"
                        + (f", re-pointed to '{c.parent_section}'" if ancestor else ", set to None"),
                    ))
                elif parent.clause_id == c.clause_id:
                    # Should not happen; guard against self-reference.
                    c.parent_section = None
                    findings.append(("repair", f"Clause '{c.section_number}' self-parent, set to None"))

            # 3. hierarchy_level consistency
            expected_level = cls._expected_level(c, by_section)
            if expected_level and c.hierarchy_level != expected_level:
                old = c.hierarchy_level
                c.hierarchy_level = expected_level
                findings.append(("repair", f"Clause '{c.section_number}' level {old} -> {expected_level}"))

            # 4. numbering grammar: child must extend its resolved parent
            if c.parent_section:
                parent = by_section.get(c.parent_section)
                if parent and not cls._is_valid_child(parent.section_number, c.section_number):
                    findings.append((
                        "warn",
                        f"Clause '{c.section_number}' numbering is not a valid child of "
                        f"parent '{parent.section_number}'",
                    ))

            # 5. heading completeness (sections expected to have a heading)
            if c.clause_type in ("section", "subsection") and not c.heading:
                findings.append(("warn", f"{c.clause_type.title()} '{c.section_number}' has no heading"))

            repaired.append(c)

        # 6. sibling numeric sequence: children sharing a parent must not skip
        #    an integer in their dotted numeric form. The same section_number can
        #    legitimately repeat under a parent across different chapters, so
        #    dedupe before comparing ordinals.
        siblings = defaultdict(list)
        for c in repaired:
            if c.parent_section and by_section.get(c.parent_section):
                siblings[c.parent_section].append(c)
        for parent_sec, children in siblings.items():
            nums = set()
            for c in children:
                # Pure dotted numeric sections only (1.2, 4.2.1); compare the
                # last segment, which is the sibling ordinal within the parent.
                if re.fullmatch(r"\d+(\.\d+)+", c.section_number):
                    nums.add((int(c.section_number.rsplit(".", 1)[1]), c.section_number))
            nums = sorted(nums)
            for i in range(1, len(nums)):
                gap = nums[i][0] - nums[i - 1][0]
                if gap > 1:
                    findings.append((
                        "warn",
                        f"Section '{nums[i][1]}' under '{parent_sec}' skips "
                        f"'{nums[i - 1][1]}' (+{gap}), possible missing section",
                    ))

        return repaired, findings

    @staticmethod
    def _nearest_ancestor(section: str, by_section: dict):
        """Find the closest existing ancestor of a missing parent section.

        Example: parent '4.2.1' missing -> try '4.2', then '4'.
        """
        parts = re.split(r"\.", section)
        while len(parts) > 1:
            parts.pop()
            candidate = ".".join(parts)
            if candidate in by_section:
                return by_section[candidate]
        return None

    @staticmethod
    def _is_valid_child(parent: str, child: str) -> bool:
        """True when child is a grammatical extension of parent per SEBI numbering.

        Allowed extensions, in order:
          - numeric:      parent + ".N"          (1 -> 1.1, 1.1 -> 1.1.1)
          - alpha/roman:  parent + "(N)"         (1.1.1 -> 1.1.1(a))
          - nested:       parent + "(N)(N)..."   ((a) -> (a)(i), (i) -> (i)(1))
        """
        if child == parent or not child.startswith(parent):
            return False
        rest = child[len(parent):]
        if re.fullmatch(r"\.\d+[A-Z]?", rest):
            return True
        if rest.startswith("("):
            tokens = re.findall(r"\(([^()]*)\)", rest)
            if tokens and "".join(f"({t})" for t in tokens) == rest:
                for t in tokens:
                    if not re.fullmatch(ClauseValidator._BULLET_TOKEN, t):
                        return False
                return True
        return False

    @staticmethod
    def _expected_level(c: ClauseSchema, by_section: dict) -> int:
        """Expected hierarchy level = parent level + 1, or the depth implied by
        the section number itself when the parent cannot be resolved (e.g. it
        points at a structure such as a chapter or annexure that is not
        persisted as a clause)."""
        if c.parent_section:
            parent = by_section.get(c.parent_section)
            if parent and parent.hierarchy_level is not None:
                return parent.hierarchy_level + 1
        return ClauseValidator._depth_level(c.section_number)

    @staticmethod
    def _depth_level(section: str) -> int:
        """Depth implied by a section number: dots + 1, plus one per bullet."""
        base = section.count(".") + 1
        bullets = len(re.findall(r"\([a-zivx\d]+\)", section, re.IGNORECASE))
        return base + bullets