from typing import Optional

from fastapi import APIRouter

from app.services.compliance_service import ComplianceService
from app.schemas.compliance import ComplianceOverview, ObligationCompliance

router = APIRouter()
service = ComplianceService()


@router.get("/overview", response_model=ComplianceOverview)
async def get_compliance_overview():
    return await service.get_overview()


@router.get("/obligations", response_model=list[ObligationCompliance])
async def get_compliance_obligations(
    document_id: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    priority: Optional[str] = None,
):
    filters: dict = {}
    if document_id:
        filters["document_id"] = document_id

    items = await service.get_obligations_compliance(filters)

    if status:
        target = status.upper()
        items = [i for i in items if i.status.value == target]
    if department:
        items = [i for i in items if (i.department or "").lower() == department.lower()]
    if priority:
        items = [i for i in items if (i.priority or "").lower() == priority.lower()]

    return items
