import logging
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

import fitz  # PyMuPDF

from app.db.mongodb import db
from app.schemas.report import (
    AuditReport,
    ReportType,
    ReportSummary,
    ReportObligation,
    ReportListItem,
)
from app.services.compliance_service import ComplianceService
from app.services.gap_service import GapService

logger = logging.getLogger("report")


class ReportService:
    """Compiles a stored, exportable audit report from compliance + gap computations."""

    async def generate(
        self, document_id: Optional[str] = None, generated_by: str = "system"
    ) -> AuditReport:
        report = await self._build(document_id, generated_by)
        database = db.get_db()
        await database.audit_reports.insert_one(report.model_dump(mode="json"))
        return report

    async def preview(
        self, document_id: Optional[str] = None, generated_by: str = "system"
    ) -> AuditReport:
        return await self._build(document_id, generated_by)

    async def _build(self, document_id: Optional[str], generated_by: str) -> AuditReport:
        compliance = await ComplianceService().get_overview(document_id)
        gaps = await GapService().get_overview(document_id)
        obligations = await ComplianceService().get_obligations_compliance(
            {"document_id": document_id} if document_id else {}
        )

        report_type = ReportType.DOCUMENT if document_id else ReportType.ORGANIZATION
        sc = compliance.status_counts
        gs = gaps.by_severity

        summary = ReportSummary(
            total_obligations=compliance.total_obligations,
            compliant=sc.get("COMPLIANT", 0),
            partially_compliant=sc.get("PARTIALLY_COMPLIANT", 0),
            non_compliant=sc.get("NON_COMPLIANT", 0),
            not_started=sc.get("NOT_STARTED", 0),
            overall_compliance_score=compliance.overall_score,
            total_gaps=gaps.total_gaps,
            critical_gaps=gs.get("CRITICAL", 0),
            high_gaps=gs.get("HIGH", 0),
            medium_gaps=gs.get("MEDIUM", 0),
            low_gaps=gs.get("LOW", 0),
        )

        obl_rows = [
            ReportObligation(
                obligation_id=o.obligation_id,
                action=o.action,
                actor=o.actor,
                is_mandatory=o.is_mandatory,
                status=o.status.value,
                is_overdue=o.is_overdue,
                tasks_total=o.tasks_total,
                tasks_completed=o.tasks_completed,
                evidence_accepted=o.evidence_accepted,
                department=o.department,
            )
            for o in obligations
        ]

        scope = document_id or "All Documents"
        title = f"Compliance Audit Report - {scope}"
        generated_at = datetime.utcnow()

        return AuditReport(
            report_id=str(uuid.uuid4()),
            report_type=report_type,
            document_id=document_id,
            title=title,
            generated_at=generated_at,
            generated_by=generated_by,
            summary=summary,
            compliance=compliance.model_dump(mode="json"),
            gaps=gaps.model_dump(mode="json"),
            obligations=obl_rows,
            metadata={
                "scope": scope,
                "generated_at": generated_at.isoformat(),
                "obligation_count": len(obl_rows),
            },
        )

    async def list_reports(self) -> List[ReportListItem]:
        database = db.get_db()
        out: List[ReportListItem] = []
        cursor = database.audit_reports.find({}).sort("generated_at", -1)
        async for doc in cursor:
            out.append(
                ReportListItem(
                    report_id=doc["report_id"],
                    title=doc.get("title", "Untitled Report"),
                    report_type=doc.get("report_type", "ORGANIZATION"),
                    document_id=doc.get("document_id"),
                    generated_at=doc.get("generated_at"),
                    overall_compliance_score=doc.get("summary", {}).get("overall_compliance_score", 0.0),
                    total_gaps=doc.get("summary", {}).get("total_gaps", 0),
                )
            )
        return out

    async def get_report(self, report_id: str) -> Optional[AuditReport]:
        database = db.get_db()
        doc = await database.audit_reports.find_one({"report_id": report_id})
        if not doc:
            return None
        return AuditReport(**doc)

    # ---- export ----

    def export_json(self, report: AuditReport) -> Dict[str, Any]:
        return report.model_dump(mode="json")

    def export_pdf(self, report: AuditReport) -> bytes:
        return _render_pdf(report)


def _render_pdf(report: AuditReport) -> bytes:
    """Render a structured audit report PDF using PyMuPDF (built-in fonts, paginated)."""
    doc = fitz.open()
    page = doc.new_page()
    W, H = page.rect.width, page.rect.height
    margin = 50
    line = 14
    y = margin

    def ensure(space: float):
        nonlocal y, page
        if y + space > H - margin:
            page = doc.new_page()
            y = margin

    def heading(text: str):
        nonlocal y, page
        ensure(line * 2.2)
        page.insert_text((margin, y), text, fontsize=15, fontname="helv", color=(0.0, 0.0, 0.0))
        y += line * 1.8

    def sub(text: str):
        nonlocal y
        ensure(line * 1.5)
        page.insert_text((margin, y), text, fontsize=12, fontname="helv", color=(0.15, 0.15, 0.15))
        y += line * 1.4

    def text(t: str, size: int = 10):
        nonlocal y
        ensure(line)
        page.insert_text((margin, y), t, fontsize=size, fontname="helv", color=(0, 0, 0))
        y += line

    def kv(k: str, v: Any):
        text(f"{k}: {v}")

    s = report.summary
    heading(report.title)
    text(f"Generated: {report.generated_at.strftime('%Y-%m-%d %H:%M UTC')}    Type: {report.report_type.value}")
    text(f"Scope: {report.metadata.get('scope', '-')}    Generated by: {report.generated_by}")
    y += line * 0.5

    sub("Executive Summary")
    kv("Total obligations", s.total_obligations)
    kv("Overall compliance score", f"{s.overall_compliance_score}%")
    kv("Compliant", s.compliant)
    kv("Partially compliant", s.partially_compliant)
    kv("Non-compliant", s.non_compliant)
    kv("Not started", s.not_started)
    kv("Total gaps", s.total_gaps)
    kv("Critical / High / Medium / Low gaps", f"{s.critical_gaps} / {s.high_gaps} / {s.medium_gaps} / {s.low_gaps}")
    y += line * 0.5

    sub("Compliance by Department")
    for d in report.compliance.get("by_department", []):
        text(f"- {d['key']}: {d['compliant']}/{d['total']} compliant ({d['score']}%)")
    y += line * 0.5

    sub("Gaps by Severity")
    for sev, label in (("CRITICAL", "Critical"), ("HIGH", "High"), ("MEDIUM", "Medium"), ("LOW", "Low")):
        text(f"- {label}: {report.gaps.get('by_severity', {}).get(sev, 0)}")
    y += line * 0.5

    sub("Gaps by Type")
    for t in report.gaps.get("by_type", []):
        text(f"- {t['key']}: {t['total']}")
    y += line * 0.5

    sub("Top Priority Gaps")
    for g in report.gaps.get("top_priority_gaps", [])[:8]:
        action = (g.get("obligation_action") or "")[:70]
        text(f"- [{g.get('severity')}] {action}: {g.get('recommended_action', '')[:80]}")
    y += line * 0.5

    sub("Obligations Register")
    for o in report.obligations:
        action = o.action[:60]
        text(
            f"- {o.status:<18} | mandatory={o.is_mandatory} overdue={o.is_overdue} | "
            f"tasks {o.tasks_completed}/{o.tasks_total} | ev {o.evidence_accepted} | {action}"
        )

    return doc.tobytes()
