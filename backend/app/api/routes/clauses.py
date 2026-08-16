from fastapi import APIRouter, HTTPException
from typing import List
from app.services.clause_service import ClauseService
from app.schemas.clause import ClauseSchema, ClauseSegmentationInput
from app.agents.clause_segmentation_agent import ClauseSegmentationAgent
from app.schemas.document import DocumentStatus

router = APIRouter()
clause_agent = ClauseSegmentationAgent()

@router.get("/documents/{document_id}/clauses", response_model=List[ClauseSchema])
async def get_document_clauses(document_id: str):
    """
    Get all segmented clauses for a specific document.
    """
    try:
        clauses = await ClauseService.get_clauses_by_document(document_id)
        return clauses
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{clause_id}", response_model=ClauseSchema)
async def get_clause(clause_id: str):
    """
    Get a single clause by its ID.
    """
    try:
        from app.db.mongodb import db
        database = db.get_db()
        clause = await database.clauses.find_one({"clause_id": clause_id})
        if not clause:
            raise HTTPException(status_code=404, detail="Clause not found")
        return clause
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/{document_id}/segment")
async def trigger_clause_segmentation(document_id: str):
    """
    Trigger the clause segmentation agent for a document manually.
    """
    try:
        input_data = ClauseSegmentationInput(document_id=document_id)
        output = await clause_agent.run(input_data)
        return {"message": "Segmentation successful", "total_clauses": output.total_clauses}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
