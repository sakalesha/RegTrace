import os
import tempfile
import logging
import requests
import fitz
import pytesseract
from pdf2image import convert_from_path
from typing import List

from app.agents.base_agent import BaseAgent
from app.schemas.parsing import ParsingInput, ParsingOutput, ParsedPage
from app.schemas.document import DocumentStatus
from app.db.mongodb import db
from app.utils.storage import StorageUtility
from app.utils.layout import extract_blocks

logger = logging.getLogger("pipeline.parse")

class ParsingAgent(BaseAgent):
    """
    The Parsing Agent downloads the document, extracts text page by page, 
    uses OCR fallback if text is missing, and updates the document with parsed text.
    """

    async def validate(self, input_data: ParsingInput):
        database = db.get_db()
        document = await database["documents"].find_one({"document_id": input_data.document_id})
        if not document:
            raise ValueError(f"Document {input_data.document_id} not found.")

    async def process(self, input_data: ParsingInput) -> ParsingOutput:
        logger.info("=== PARSE START   doc=%s", input_data.document_id)
        database = db.get_db()
        document = await database["documents"].find_one({"document_id": input_data.document_id})
        
        file_path = document.get("file_storage_path")
        is_temp_file = False
        local_path = file_path

        if file_path.startswith("http"):
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            tmp.close()
            StorageUtility.download_file(file_path, input_data.document_id, tmp.name)
            local_path = tmp.name
            is_temp_file = True

        parsed_pages = []
        try:
            doc = fitz.open(local_path)
            for page_num in range(doc.page_count):
                page = doc.load_page(page_num)
                text = page.get_text("text").strip()

                used_ocr = False
                if len(text) < 50:
                    try:
                        images = convert_from_path(local_path, first_page=page_num+1, last_page=page_num+1)
                        if images:
                            ocr_text = pytesseract.image_to_string(images[0])
                            text = ocr_text.strip()
                            used_ocr = True
                    except Exception as e:
                        # Fallback just in case OCR dependencies (like poppler) are missing
                        logger.warning("OCR failed for page %d: %s", page_num + 1, e)

                # Layout blocks are only available for text-extracted (non-OCR) pages.
                blocks = [] if used_ocr else extract_blocks(page)

                parsed_pages.append(ParsedPage(
                    page_number=page_num + 1,
                    text=text,
                    blocks=blocks,
                ))
            doc.close()
        finally:
            if is_temp_file and os.path.exists(local_path):
                os.remove(local_path)

        output = ParsingOutput(
            document_id=input_data.document_id,
            pages=parsed_pages,
            total_pages=len(parsed_pages),
            processing_status=DocumentStatus.PARSED
        )
        ocr_pages = sum(1 for p in parsed_pages if p.blocks == [] and p.text)
        logger.info("=== PARSE DONE   doc=%s | %d pages parsed (OCR on %d)",
                    input_data.document_id, len(parsed_pages), ocr_pages)
        return output

    async def validate_output(self, output_data: ParsingOutput):
        if not output_data.pages:
            raise ValueError("No pages were parsed.")

    async def persist(self, output_data: ParsingOutput):
        database = db.get_db()
        pages_dict = [page.dict() for page in output_data.pages]
        await database["documents"].update_one(
            {"document_id": output_data.document_id},
            {"$set": {
                "pages": pages_dict,
                "processing_status": output_data.processing_status.value
            }}
        )
