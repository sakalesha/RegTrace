from typing import Optional

from fastapi import APIRouter
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

from app.services.report_service import ReportService
from app.schemas.report import AuditReport, ReportListItem

router = APIRouter()
service = ReportService()


class ReportGenerateRequest(BaseModel):
    document_id: Optional[str] = None
    generated_by: Optional[str] = "system"


@router.post("/generate", response_model=AuditReport)
async def generate_report(req: ReportGenerateRequest):
    return await service.generate(req.document_id, req.generated_by or "system")


@router.post("/preview", response_model=AuditReport)
async def preview_report(req: ReportGenerateRequest):
    return await service.preview(req.document_id, req.generated_by or "system")


@router.get("", response_model=list[ReportListItem])
async def list_reports():
    return await service.list_reports()


@router.get("/{report_id}", response_model=AuditReport)
async def get_report(report_id: str):
    report = await service.get_report(report_id)
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/export")
async def export_report(report_id: str, format: str = "json"):
    report = await service.get_report(report_id)
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Report not found")

    if format == "pdf":
        data = service.export_pdf(report)
        return Response(
            content=data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="report_{report_id}.pdf"'},
        )
    return JSONResponse(content=service.export_json(report))
