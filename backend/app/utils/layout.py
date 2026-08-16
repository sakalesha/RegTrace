"""Layout-aware helpers for extracting rich text geometry from PyMuPDF pages.

`extract_blocks(page)` returns per-line geometry (bounding box, font size,
bold flag, font name) gathered from `page.get_text("dict")`. This gives the
clause segmenter the signals it needs to identify headings that carry no
numbering and to reason about visual indentation.
"""

from typing import List
import re

import fitz

from app.schemas.parsing import ParsedLine

# PyMuPDF span flag bit 2^4 marks bold text.
_BOLD_FLAG = 1 << 4


def extract_blocks(page: "fitz.Page") -> List[ParsedLine]:
    """Extract one ParsedLine per text line on the page, with geometry.

    Image blocks (type != 0) are skipped. Lines without text are skipped.
    """
    lines: List[ParsedLine] = []
    data = page.get_text("dict")
    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        block_bbox = block.get("bbox", (0, 0, 0, 0))
        for line in block.get("lines", []):
            spans = [s for s in line.get("spans", []) if s.get("text", "").strip()]
            if not spans:
                continue
            text = " ".join(span.get("text", "") for span in spans)
            text = re.sub(r"\s+", " ", text).strip()
            if not text:
                continue
            sizes = [span.get("size", 0.0) for span in spans]
            fonts = [span.get("font", "") for span in spans]
            bold = any(bool(span.get("flags", 0) & _BOLD_FLAG) for span in spans)
            x0s = [span.get("bbox", block_bbox)[0] for span in spans]
            y0s = [span.get("bbox", block_bbox)[1] for span in spans]
            lines.append(ParsedLine(
                text=text,
                x0=min(x0s) if x0s else block_bbox[0],
                y0=min(y0s) if y0s else block_bbox[1],
                size=max(sizes) if sizes else 0.0,
                bold=bold,
                font=fonts[0] if fonts else None,
            ))
    return lines
