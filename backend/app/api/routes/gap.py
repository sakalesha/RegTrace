from typing import Optional

from fastapi import APIRouter

from app.services.gap_service import GapService
from app.schemas.gap import GapOverview, GapItem

router = APIRouter()
service = GapService()


@router.get("/overview", response_model=GapOverview)
async def get_gap_overview():
    return await service.get_overview()


@router.get("/items", response_model=list[GapItem])
async def get_gap_items(
    severity: Optional[str] = None,
    type: Optional[str] = None,
    department: Optional[str] = None,
):
    filters: dict = {}
    if severity:
        filters["severity"] = severity
    if type:
        filters["type"] = type
    if department:
        filters["department"] = department
    return await service.get_gap_items(filters)
