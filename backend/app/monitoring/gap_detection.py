import uuid
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_date
from shared.database.mongodb import get_db
from shared.config.settings import settings
from shared.services.audit import AuditLogService
from backend.app.monitoring.models import GapType

async def _record_gap(db, gap_type: GapType, obligation_id: str = None, task_id: str = None, circular_id: str = None, description: str = "", run_id: str = "") -> bool:
    """Records a gap if it doesn't already exist (idempotent). Returns True if a new gap was created."""
    gap_id = f"GAP-{uuid.uuid4().hex[:8].upper()}"
    
    query = {
        "gap_type": gap_type.value,
        "resolved": False
    }
    if obligation_id:
        query["obligation_id"] = obligation_id
    if task_id:
        query["task_id"] = task_id
        
    result = await db.compliance_gaps.update_one(
        query,
        {
            "$setOnInsert": {
                "gap_id": gap_id,
                "gap_type": gap_type.value,
                "obligation_id": obligation_id,
                "task_id": task_id,
                "circular_id": circular_id,
                "description": description,
                "detected_at": datetime.utcnow(),
                "detected_by_run_id": run_id,
                "resolved": False,
                "resolved_at": None,
                "resolved_by": None,
                "resolution_note": None
            }
        },
        upsert=True
    )
    return bool(result.upserted_id)

async def check_missing_tasks(db, run_id: str, new_gaps_ids: list) -> int:
    """Check 1: Missing task for approved obligation"""
    gaps_detected = 0
    # Find obligations that are approved/edited
    obligations = await db.obligations.find({"status": {"$in": ["APPROVED", "VALIDATED", "EDITED"]}}).to_list(None)
    for ob in obligations:
        ob_id = ob.get("obligation_id")
        if not ob_id:
            continue
            
        # Check if any task references this obligation
        task_count = await db.compliance_tasks.count_documents({"obligation_id": ob_id})
        if task_count == 0:
            desc = f"Obligation {ob_id} is in status {ob.get('status')} but has no associated task."
            if await _record_gap(db, GapType.MISSING_TASK, obligation_id=ob_id, circular_id=ob.get("circular_id"), description=desc, run_id=run_id):
                gaps_detected += 1
                
    return gaps_detected

async def check_stale_deadlines(db, run_id: str, new_gaps_ids: list) -> int:
    """Check 2: Stale unassigned deadlines"""
    gaps_detected = 0
    threshold = settings.stale_deadline_threshold_days
    
    tasks = await db.compliance_tasks.find({
        "status": {"$in": ["OPEN", "IN_PROGRESS"]},
        "$or": [
            {"deadline": None},
            {"deadline": ""}
        ]
    }).to_list(None)
    
    for task in tasks:
        created_at = task.get("created_at")
        dt_created = None
        if isinstance(created_at, datetime):
            dt_created = created_at
        elif isinstance(created_at, str):
            try:
                dt_created = parse_date(created_at).replace(tzinfo=None)
            except Exception:
                pass
                
        if dt_created:
            age_days = (datetime.utcnow() - dt_created).days
            if age_days > threshold:
                desc = f"Task {task.get('task_id')} has been unassigned a deadline for {age_days} days (threshold: {threshold} days)."
                if await _record_gap(db, GapType.STALE_DEADLINE, obligation_id=task.get("obligation_id"), task_id=task.get("task_id"), description=desc, run_id=run_id):
                    gaps_detected += 1
                    
    return gaps_detected

async def check_orphaned_obligations(db, run_id: str, new_gaps_ids: list) -> int:
    """Check 3: Orphaned obligations"""
    gaps_detected = 0
    # Pending, approved, edited obligations with a circular_id
    obligations = await db.obligations.find({
        "status": {"$in": ["PENDING_VALIDATION", "APPROVED", "VALIDATED", "EDITED"]},
        "circular_id": {"$ne": None}
    }).to_list(None)
    
    for ob in obligations:
        circ_id = ob.get("circular_id")
        if not circ_id:
            continue
            
        circular = await db.circulars.find_one({"circular_id": circ_id})
        if not circular:
            desc = f"Obligation {ob.get('obligation_id')} references a circular ({circ_id}) that no longer exists."
            if await _record_gap(db, GapType.ORPHANED_OBLIGATION, obligation_id=ob.get("obligation_id"), circular_id=circ_id, description=desc, run_id=run_id):
                gaps_detected += 1
                
    return gaps_detected

async def run_gap_checks(run_id: str) -> int:
    """Runs all three gap checks and returns total new gaps detected."""
    db = get_db()
    new_gaps_ids = []
    
    gaps_1 = await check_missing_tasks(db, run_id, new_gaps_ids)
    gaps_2 = await check_stale_deadlines(db, run_id, new_gaps_ids)
    gaps_3 = await check_orphaned_obligations(db, run_id, new_gaps_ids)
    
    total_gaps = gaps_1 + gaps_2 + gaps_3
    
    if total_gaps > 0:
        await AuditLogService.append("COMPLIANCE_GAPS_DETECTED", {
            "monitoring_run_id": run_id,
            "gap_count": total_gaps
        }, actor="system")
        
    return total_gaps
