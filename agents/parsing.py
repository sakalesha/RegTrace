import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import uuid

from shared.database.mongodb import get_db
from shared.schemas.document import DocumentNode
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger

class ParsingAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("ParsingAgent", f"Started for {document_id}")
        db = get_db()
        
        # 1. Fetch raw document metadata
        raw_doc = await db.raw_documents.find_one({"document_id": document_id})
        if not raw_doc:
            raise ValueError(f"No raw document found for {document_id}")
            
        file_path = raw_doc["file_path"]
        
        Logger.info("ParsingAgent", f"Parsing PDF with PyMuPDF: {file_path}")
        
        nodes = []
        current_heading = None
        current_section = None
        
        try:
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                
                # Extract text blocks
                blocks = page.get_text("dict")["blocks"]
                
                page_text = ""
                for b in blocks:
                    if b['type'] == 0:  # Text block
                        for l in b["lines"]:
                            for s in l["spans"]:
                                text = s["text"].strip()
                                if not text:
                                    continue
                                    
                                # Simple heuristic: if font is large or bold, treat as heading
                                is_bold = "bold" in s["font"].lower()
                                size = s["size"]
                                
                                if (size > 12 or is_bold) and len(text) < 100:
                                    current_heading = text
                                    current_section = f"Sec-{page_num + 1}"
                                
                                page_text += text + " "
                            page_text += "\n"
                                
                if not page_text.strip():
                    Logger.info("ParsingAgent", f"Page {page_num+1} is empty, trying OCR...")
                    try:
                        pix = page.get_pixmap()
                        img = Image.open(io.BytesIO(pix.tobytes()))
                        page_text = pytesseract.image_to_string(img)
                    except pytesseract.TesseractNotFoundError:
                        Logger.warning("ParsingAgent", "Tesseract not installed on host. Skipping OCR fallback.")
                    except Exception as ocr_e:
                        Logger.error("ParsingAgent", "OCR fallback failed", exc=ocr_e)
                    
                if page_text.strip():
                    node = DocumentNode(
                        node_id=f"NOD-{uuid.uuid4().hex[:8].upper()}",
                        document_id=document_id,
                        page_number=page_num + 1,
                        heading=current_heading,
                        section=current_section,
                        content=page_text.strip()
                    )
                    nodes.append(node.model_dump())
                    
        except Exception as e:
            Logger.error("ParsingAgent", "Failed to parse PDF", exc=e)
            raise e
            
        Logger.info("ParsingAgent", f"Successfully extracted {len(nodes)} document nodes.")
        
        # 2. Store parsed nodes
        if nodes:
            await db.parsed_nodes.insert_many(nodes)
        
        # 3. Update original document status
        await db.raw_documents.update_one(
            {"document_id": document_id},
            {"$set": {"status": "PARSED"}}
        )
        
        return context
