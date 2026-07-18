import re
import uuid
from typing import List, Dict, Optional

from shared.database.mongodb import get_db
from shared.schemas.document import ClauseRecord
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger

class ClauseSegmentationAgent(BaseAgent):
    
    HEADING_PATTERN = re.compile(r"^(CHAPTER|PART|SECTION|ANNEXURE|SCHEDULE)\s+.*", re.IGNORECASE)
    # Matches "1.", "1.1", "1.1.1", "A."
    NUMBER_PATTERN = re.compile(r"^(\d+(?:\.\d+)*\.?|[A-Z]\.)\s+(.*)")
    # Matches "(a)", "(i)", "(ii)", "(1)"
    LIMB_PATTERN = re.compile(r"^(\([a-z0-9ivxlcdm]+\))\s+(.*)", re.IGNORECASE)
    # Matches "(a) This is a rule..."
    PAGE_PATTERN = re.compile(r"^---\s*Page\s+(\d+)\s*---$")
    # Matches --- Page 1 ---

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        Logger.info("ClauseSegmentationAgent", f"Started for {context.document_id}")
        
        raw_text = context.metadata.get("raw_text")
        if not raw_text:
            Logger.warning("ClauseSegmentationAgent", "No raw text provided in context metadata.")
            return context
            
        clauses = cls._parse_text(raw_text, context.document_id)
        
        Logger.info("ClauseSegmentationAgent", f"Generated {len(clauses)} clauses.")
        
        if clauses:
            db = get_db()
            from datetime import datetime
            
            run_id = f"SEG-{uuid.uuid4().hex[:8].upper()}"
            context.metadata["segmentation_run_id"] = run_id
            
            run_doc = {
                "run_id": run_id,
                "document_id": context.document_id,
                "started_at": datetime.utcnow(),
                "status": "COMPLETED",
                "clause_count": len(clauses)
            }
            
            async with await db.client.start_session() as session:
                async with session.start_transaction():
                    await db.segmentation_runs.insert_one(run_doc, session=session)
                    await db.clauses.insert_many([c.model_dump() for c in clauses], session=session)
            
            context.metadata["clause_ids"] = [c.clause_id for c in clauses]
            
        return context

    @classmethod
    def _parse_text(cls, raw_text: str, document_id: str) -> List[ClauseRecord]:
        lines = raw_text.split('\n')
        
        clauses: List[ClauseRecord] = []
        
        hierarchy_path: List[str] = []
        open_clauses: List[Dict] = [] # list of dicts: {"id": str, "num": str, "depth": int}
        
        current_clause_id: Optional[str] = None
        current_clause_num: Optional[str] = None
        current_clause_page: int = 1
        current_text_buffer: List[str] = []
        current_page = 1
        sequence_num = 1
        
        def finalize_current_clause():
            nonlocal sequence_num, current_clause_id, current_clause_num, current_text_buffer, current_clause_page
            if current_text_buffer and current_clause_id:
                text = " ".join([l.strip() for l in current_text_buffer if l.strip()])
                if text:
                    parent_id = open_clauses[-2]["id"] if len(open_clauses) > 1 else None
                    record = ClauseRecord(
                        clause_id=current_clause_id,
                        document_id=document_id,
                        clause_number=current_clause_num,
                        parent_clause_id=parent_id,
                        hierarchy_path=list(hierarchy_path),
                        text=text,
                        page_number=current_clause_page,
                        sequence_number=sequence_num
                    )
                    clauses.append(record)
                    sequence_num += 1
            current_text_buffer = []

        def start_new_clause(num: Optional[str], depth: int, line_text: str):
            nonlocal current_clause_id, current_clause_num, open_clauses, current_clause_page
            finalize_current_clause()
            
            # Pop stack until we are at the right parent depth
            while open_clauses and open_clauses[-1]["depth"] >= depth:
                open_clauses.pop()
                
            current_clause_id = f"CLS-{uuid.uuid4().hex[:8].upper()}"
            current_clause_num = num
            current_clause_page = current_page
            open_clauses.append({"id": current_clause_id, "num": num, "depth": depth})
            current_text_buffer.append(line_text)

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
                
            # 1. Page Markers
            page_match = cls.PAGE_PATTERN.match(line_str)
            if page_match:
                current_page = int(page_match.group(1))
                continue
                
            # 2. Structural Headings
            heading_match = cls.HEADING_PATTERN.match(line_str)
            # Heuristic for generic heading: All caps, short, not a clause number
            is_generic_heading = line_str.isupper() and len(line_str) < 80 and not cls.NUMBER_PATTERN.match(line_str) and not cls.LIMB_PATTERN.match(line_str)
            
            if heading_match or is_generic_heading:
                finalize_current_clause()
                
                # If it's a major heading (e.g., CHAPTER), it resets the clause hierarchy
                if heading_match:
                    hierarchy_path = [line_str]
                    open_clauses = [] # Reset open clauses since chapter changed
                else:
                    # Append sub-heading. Keep hierarchy path shallow to avoid deep nesting of random capitalized lines
                    if len(hierarchy_path) > 2:
                        hierarchy_path.pop()
                    hierarchy_path.append(line_str)
                continue
                
            # 3. Clause Numbering Detection
            num_match = cls.NUMBER_PATTERN.match(line_str)
            limb_match = cls.LIMB_PATTERN.match(line_str)
            
            if num_match:
                num = num_match.group(1)
                text_part = num_match.group(2)
                
                # Calculate depth based on dot separators (e.g., 4.1.1 is depth 3)
                depth = num.count('.') + 1
                if num.endswith('.'):
                    depth -= 1 # '1.' is depth 1, '1.1.' is depth 2
                depth = max(1, depth)
                
                # Handle edge case where A. is depth 1
                if num[0].isalpha():
                    depth = 1
                    
                start_new_clause(num, depth, line_str)
                
            elif limb_match:
                num = limb_match.group(1)
                text_part = limb_match.group(2)
                
                # Check if it's a sibling of the current deepest clause
                is_sibling = False
                depth = 1
                if open_clauses:
                    last_open = open_clauses[-1]
                    last_num = last_open["num"]
                    if last_num and last_num.startswith('(') and num.startswith('('):
                        # Both are limbs. Determine if they are the same type.
                        last_inner = last_num[1:-1].lower()
                        curr_inner = num[1:-1].lower()
                        
                        last_is_roman = bool(re.match(r"^[ivxlcdm]+$", last_inner))
                        curr_is_roman = bool(re.match(r"^[ivxlcdm]+$", curr_inner))
                        
                        # Disambiguate alphabetic sequences (h) -> (i) and (i) -> (j)
                        if (curr_inner == 'i' and last_inner == 'h') or (curr_inner == 'j' and last_inner == 'i'):
                            curr_is_roman = False
                            last_is_roman = False
                            
                        if last_is_roman == curr_is_roman:
                            is_sibling = True
                            
                    if is_sibling:
                        depth = last_open["depth"]
                    else:
                        depth = last_open["depth"] + 1
                        
                start_new_clause(num, depth, line_str)
                
            # 4. Continuation Line or Unnumbered Intro Text
            else:
                if not current_clause_id:
                    # Create an "intro" clause with null clause_number
                    start_new_clause(None, 1, line_str)
                else:
                    current_text_buffer.append(line_str)
                    
        # Flush the final clause
        finalize_current_clause()
        
        return clauses
