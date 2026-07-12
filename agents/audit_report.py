import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any

from shared.database.mongodb import get_db
from shared.schemas.audit_report import AuditReport
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

class AuditReportAgent:
    
    @classmethod
    async def process_document(cls, document_id: str):
        print(f"Audit Report Agent started for {document_id}")
        db = get_db()
        
        # 1. Fetch Data
        obligations = await db.obligations.find({"document_id": document_id}).to_list(length=None)
        tasks = await db.compliance_tasks.find({"document_id": document_id}).to_list(length=None)
        evidence = await db.evidence.find({"document_id": document_id}).to_list(length=None)
        evaluations = await db.compliance_results.find({"document_id": document_id}).to_list(length=None)
        gaps = await db.compliance_gaps.find({"document_id": document_id}).to_list(length=None)
        
        # Build lookups
        task_lookup = {t["task_id"]: t for t in tasks}
        ev_lookup = {}
        for e in evidence:
            ev_lookup.setdefault(e["task_id"], []).append(e)
            
        eval_lookup = {e["obligation_id"]: e for e in evaluations}
        gap_lookup = {g["obligation_id"]: g for g in gaps}
        
        # 2. Executive Summary
        total_obligations = len(obligations)
        compliant_count = 0
        non_compliant_count = 0
        partially_compliant_count = 0
        pending_count = 0
        
        detailed_findings = []
        
        for obs in obligations:
            obs_id = obs.get("id") or obs.get("obligation_id")
            evaluation = eval_lookup.get(obs_id)
            gap = gap_lookup.get(obs_id)
            
            # Find tasks for this obligation
            obs_tasks = [t for t in tasks if t.get("obligation_id") == obs_id]
            
            status = evaluation["status"] if evaluation else "PENDING"
            
            if status == "COMPLIANT":
                compliant_count += 1
            elif status == "NON_COMPLIANT":
                non_compliant_count += 1
            elif status == "PARTIALLY_COMPLIANT":
                partially_compliant_count += 1
            else:
                pending_count += 1
                
            finding = {
                "sebi_clause": obs.get("clause", "N/A"),
                "obligation_description": obs.get("description", ""),
                "tasks": [{"task_id": t["task_id"], "title": t.get("title", "")} for t in obs_tasks],
                "compliance_status": status,
            }
            
            if gap:
                finding["gap"] = gap.get("description")
                finding["risk_level"] = gap.get("severity")
                finding["recommendation"] = gap.get("recommendation")
                
            detailed_findings.append(finding)
            
        overall_compliance = (compliant_count / total_obligations * 100) if total_obligations > 0 else 0.0
        
        executive_summary = {
            "total_obligations": total_obligations,
            "compliant": compliant_count,
            "partially_compliant": partially_compliant_count,
            "non_compliant": non_compliant_count,
            "pending": pending_count,
            "overall_compliance_percentage": overall_compliance
        }
        
        report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
        
        # Ensure directories exist
        os.makedirs("storage/reports", exist_ok=True)
        
        pdf_path = f"storage/reports/{document_id}_report.pdf"
        json_path = f"storage/reports/{document_id}_report.json"
        
        report_paths = {
            "pdf": pdf_path,
            "json": json_path
        }
        
        # Generate JSON Report
        report_data = {
            "report_id": report_id,
            "document_id": document_id,
            "generated_at": datetime.utcnow().isoformat(),
            "executive_summary": executive_summary,
            "detailed_findings": detailed_findings
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)
            
        # Generate PDF Report
        try:
            cls._generate_pdf(pdf_path, report_data)
        except Exception as e:
            print(f"Failed to generate PDF: {e}")
        
        # 3. Store Report in MongoDB
        report_record = AuditReport(
            report_id=report_id,
            document_id=document_id,
            overall_compliance=overall_compliance,
            executive_summary=executive_summary,
            detailed_findings=detailed_findings,
            report_paths=report_paths
        )
        
        await db.audit_reports.insert_one(report_record.model_dump())
        
        print(f"Audit Report Agent finished for {document_id}. Reports saved to {pdf_path} and {json_path}")
        print("Compliance Process Completed")
        
    @classmethod
    def _generate_pdf(cls, file_path: str, data: Dict[str, Any]):
        doc = SimpleDocTemplate(file_path, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        story.append(Paragraph("Compliance Audit Report", styles['Title']))
        story.append(Spacer(1, 12))
        
        story.append(Paragraph(f"<b>Document ID:</b> {data['document_id']}", styles['Normal']))
        story.append(Paragraph(f"<b>Generated At:</b> {data['generated_at']}", styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Executive Summary
        story.append(Paragraph("Executive Summary", styles['Heading2']))
        summary = data['executive_summary']
        summary_data = [
            ["Metric", "Value"],
            ["Total Obligations", str(summary['total_obligations'])],
            ["Compliant", str(summary['compliant'])],
            ["Partially Compliant", str(summary['partially_compliant'])],
            ["Non-Compliant", str(summary['non_compliant'])],
            ["Pending", str(summary['pending'])],
            ["Overall Compliance", f"{summary['overall_compliance_percentage']:.2f}%"]
        ]
        
        t = Table(summary_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        story.append(t)
        story.append(Spacer(1, 20))
        
        # Detailed Findings
        story.append(Paragraph("Detailed Findings", styles['Heading2']))
        
        for finding in data['detailed_findings']:
            story.append(Paragraph(f"<b>Clause:</b> {finding.get('sebi_clause')}", styles['Heading3']))
            story.append(Paragraph(f"<b>Status:</b> {finding.get('compliance_status')}", styles['Normal']))
            story.append(Paragraph(f"<b>Description:</b> {finding.get('obligation_description')}", styles['Normal']))
            
            if 'gap' in finding:
                story.append(Paragraph(f"<font color='red'><b>Gap:</b> {finding['gap']} (Risk: {finding.get('risk_level')})</font>", styles['Normal']))
                story.append(Paragraph(f"<b>Recommendation:</b> {finding['recommendation']}", styles['Normal']))
            
            story.append(Spacer(1, 10))
            
        doc.build(story)
