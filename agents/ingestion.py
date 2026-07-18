import os
import uuid
import shutil
import fitz  # PyMuPDF
from docx import Document

from shared.database.mongodb import get_db
from shared.schemas.document import DocumentRecord
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger
from shared.services.storage import StorageService

class IngestionAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        Logger.info("IngestionAgent", "Starting ingestion process...")
        db = get_db()
        
        file_path = context.metadata.get("file_path")
        filename = context.metadata.get("filename")
        metadata_input = context.metadata.get("metadata_input")
        raw_text_input = context.metadata.get("raw_text")
        
        if not metadata_input:
            raise ValueError("metadata_input missing from ExecutionContext metadata")
            
        document_id = context.document_id
        if not document_id:
            document_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
            context.document_id = document_id
            
        Logger.info("IngestionAgent", f"Using document_id: {document_id}")
        
        file_size = 0
        extracted_text = ""
        
        if file_path and os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                raise ValueError(f"Uploaded file {filename} is empty.")
                
            Logger.info("IngestionAgent", f"Extracting text from {file_path}")
            extracted_text = cls._extract_text(file_path, filename)
            
        elif raw_text_input:
            extracted_text = raw_text_input
        else:
            raise ValueError("Either file_path or raw_text must be provided.")
            
        import re
        stripped_text = re.sub(r"--- Page \d+ ---", "", extracted_text).strip()
        if not stripped_text:
            raise ValueError("Extracted text contains no substantive content.")
            
        # Update context with raw_text
        context.metadata["raw_text"] = extracted_text
        Logger.info("IngestionAgent", f"Extracted {len(extracted_text)} characters of raw text.")
        
        # 4. Save Document Information
        doc_record = DocumentRecord(
            document_id=document_id,
            title=metadata_input.title or (filename if filename else "Raw Text Input"),
            source=metadata_input.source or "Upload",
            document_type=metadata_input.document_type or "PDF",
            publication_date=metadata_input.publication_date or "",
            language=metadata_input.language or "English",
            status="READY_FOR_PROCESSING",
            file_path=file_path or "",
            file_size=file_size if file_size > 0 else None,
            raw_text=extracted_text,
            checksum="DUMMY_CHECKSUM"
        )
        
        await db.raw_documents.insert_one(doc_record.model_dump())
        Logger.info("IngestionAgent", "Document metadata stored in MongoDB.")
        
        return context

    @classmethod
    def _extract_text(cls, file_path: str, filename: str) -> str:
        text = ""
        try:
            ext = os.path.splitext(filename)[1].lower()
            if ext == ".pdf":
                doc = fitz.open(file_path)
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    page_text = page.get_text("text").strip()
                    
                    # If page text is very short, it might be a scanned image with just a watermark or page number
                    if len(page_text) < 100:
                        Logger.info("IngestionAgent", f"Page {page_num + 1} has very little text ({len(page_text)} chars), attempting OCR...")
                        try:
                            import pytesseract
                            from PIL import Image
                            import io
                            
                            pix = page.get_pixmap(dpi=300) # Higher DPI for better OCR
                            img = Image.open(io.BytesIO(pix.tobytes()))
                            ocr_text = pytesseract.image_to_string(img).strip()
                            
                            # Use OCR text if it yielded more content than the standard extraction
                            if len(ocr_text) > len(page_text):
                                page_text = ocr_text
                        except ImportError:
                            Logger.warning("IngestionAgent", "pytesseract or PIL not installed. Skipping OCR.")
                        except pytesseract.TesseractNotFoundError:
                            Logger.warning("IngestionAgent", "Tesseract executable not found on host. Skipping OCR.")
                        except Exception as ocr_e:
                            Logger.error("IngestionAgent", "OCR fallback failed", exc=ocr_e)
                            
                    text += f"--- Page {page_num + 1} ---\n{page_text}\n\n"
                doc.close()
            elif ext == ".docx":
                doc = Document(file_path)
                for para in doc.paragraphs:
                    text += para.text + "\n"
            elif ext == ".txt":
                with open(file_path, "r", encoding="utf-8") as f:
                    text = f.read()
            else:
                raise ValueError(f"Cannot extract text from {ext} files.")
        except Exception as e:
            Logger.error("IngestionAgent", f"Failed to extract text from {filename}", exc=e)
            raise ValueError(f"Failed to extract text: {str(e)}")
            
        return text
