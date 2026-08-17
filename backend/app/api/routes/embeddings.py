import logging

from fastapi import APIRouter, Query
from typing import Optional

from app.services.embedding_service import embed_document, embed_all_documents

logger = logging.getLogger("embed")
router = APIRouter()


@router.post("/generate")
async def generate_embeddings(document_id: str = Query(..., description="Document to (re)embed")):
    """Compute and store embeddings for a single document's clauses + obligations."""
    try:
        count = await embed_document(document_id)
    except Exception as e:
        logger.exception("Embedding generation failed for %s", document_id)
        return {"document_id": document_id, "updated": 0, "error": str(e)}
    return {"document_id": document_id, "updated": count}


@router.post("/backfill")
async def backfill_embeddings():
    """Compute and store embeddings for every document in the database."""
    try:
        total = await embed_all_documents()
    except Exception as e:
        logger.exception("Embedding backfill failed")
        return {"updated": 0, "error": str(e)}
    return {"updated": total}
