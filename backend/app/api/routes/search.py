from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.schemas.search import SearchResponse, SearchType, SearchMode
from app.services.search_service import SearchService

router = APIRouter()
service = SearchService()


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    mode: SearchMode = Query(SearchMode.ALL, description="KEYWORD | SEMANTIC | ALL"),
    type: SearchType = Query(SearchType.ALL, description="ALL | CLAUSE | OBLIGATION | DOCUMENT"),
    document_id: Optional[str] = Query(None, description="Restrict to a single document"),
    limit: int = Query(30, ge=1, le=100),
):
    """Keyword and/or semantic search across clauses, obligations, and documents."""
    try:
        return await service.search(
            q=q, mode=mode.value, type_=type.value, document_id=document_id, limit=limit
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")
