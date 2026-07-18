import uuid
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_date
from shared.database.mongodb import get_db
from shared.services.logger import Logger
from shared.services.audit import AuditLogService

class ContinuousMonitoringAgent:
    """
    Background agent that scans the tasks collection to:
    1. Detect overdue tasks and escalate priorities.
    2. Materialize the next occurrence of recurring tasks.
    3. Detect compliance gaps (e.g., approved obligations with no tasks).
    """

    @classmethod
    async def run_cycle(cls) -> dict:
        run_id = f"MON-{uuid.uuid4().hex[:8].upper()}"
        Logger.info("ContinuousMonitoringAgent", f"Starting monitoring cycle {run_id}")
        
        db = get_db()
        stats = {
            "tasks_scanned": 0,
            "overdue_flagged": 0,
            "recurrences_materialized": 0,
            "gaps_detected": 0
        }
        
        start_time = datetime.utcnow()
        
        await db.system_events.insert_one({
            "event": "MONITORING_RUN_STARTED",
            "run_id": run_id,
            "timestamp": start_time.isoformat()
        })
        
        try:
            # 1. Deadline & Overdue Scan
            # For MVP, we fetch all OPEN/IN_PROGRESS tasks.
            open_tasks = await db.compliance_tasks.find({"status": {"$in": ["OPEN", "IN_PROGRESS"]}}).to_list(None)
            stats["tasks_scanned"] = len(open_tasks)
            
            for task in open_tasks:
                deadline_str = task.get("deadline")
                
                # Check for stale unassigned deadlines (Gap detection)
                if not deadline_str:
                    created_at = task.get("created_at")
                    dt_created = None
                    if isinstance(created_at, datetime):
                        dt_created = created_at
                    elif isinstance(created_at, str):
                        try:
                            dt_created = parse_date(created_at).replace(tzinfo=None)
                        except:
                            pass
                            
                    if dt_created and (datetime.utcnow() - dt_created).days > 7:
                        # Gap: Task exists for >7 days without a deadline
                        await cls._record_gap(
                            db, 
                            "unassigned_deadline_stale", 
                            task.get("obligation_id"), 
                            task.get("task_id")
                        )
                        stats["gaps_detected"] += 1
                    continue
                
                # Attempt to parse deadline
                try:
                    due_date = parse_date(deadline_str)
                    
                    # If overdue
                    if due_date < datetime.utcnow():
                        await db.compliance_tasks.update_one(
                            {"task_id": task["task_id"]},
                            {"$set": {"status": "OVERDUE", "priority": "HIGH"}}
                        )
                        await AuditLogService.append("TASK_OVERDUE", {"task_id": task["task_id"]})
                        stats["overdue_flagged"] += 1
                        
                except Exception:
                    # Deadline is likely relative/unparseable (e.g. "Within 30 days")
                    pass

            # 2. Gap Detection: Missing tasks for approved obligations
            approved_obligations = await db.obligations.find({"status": {"$in": ["APPROVED", "VALIDATED", "EDITED"]}}).to_list(None)
            for ob in approved_obligations:
                if not ob.get("task_id"):
                    await cls._record_gap(
                        db,
                        "missing_task_for_approved_obligation",
                        ob.get("obligation_id"),
                        None
                    )
                    stats["gaps_detected"] += 1

            # 3. Recurrence Generation
            completed_tasks = await db.compliance_tasks.find({"status": "COMPLETED"}).to_list(None)
            for task in completed_tasks:
                frequency = task.get("frequency")
                if not frequency or frequency.lower() in ["none", "one time", ""]:
                    continue
                    
                # Check if next occurrence already exists
                existing_next = await db.compliance_tasks.find_one({
                    "obligation_id": task["obligation_id"],
                    "previous_occurrence_id": task["task_id"]
                })
                
                if not existing_next:
                    # Generate next occurrence
                    new_task_id = f"TSK-{uuid.uuid4().hex[:8].upper()}"
                    new_task = {
                        "task_id": new_task_id,
                        "document_id": task.get("document_id"),
                        "obligation_id": task.get("obligation_id"),
                        "title": task.get("title"),
                        "description": task.get("description"),
                        "owner_role": task.get("owner_role"),
                        "priority": task.get("priority"),
                        "status": "OPEN",
                        "frequency": frequency,
                        "evidence_required": task.get("evidence_required"),
                        "trace": task.get("trace"),
                        "previous_occurrence_id": task["task_id"],
                        "created_at": datetime.utcnow()
                    }
                    
                    # Compute next deadline simply if possible
                    # Real scheduling engines use iCal rules, we do a basic MVP approximation
                    if task.get("deadline"):
                        try:
                            old_due = parse_date(task["deadline"])
                            if "year" in frequency.lower() or "annual" in frequency.lower():
                                new_due = old_due + timedelta(days=365)
                            elif "quarter" in frequency.lower():
                                new_due = old_due + timedelta(days=90)
                            elif "month" in frequency.lower():
                                new_due = old_due + timedelta(days=30)
                            else:
                                new_due = old_due
                            new_task["deadline"] = new_due.isoformat()
                        except:
                            new_task["deadline"] = None
                            
                    await db.compliance_tasks.insert_one(new_task)
                    await AuditLogService.append("TASK_RECURRENCE_GENERATED", {
                        "task_id": new_task_id,
                        "parent_task_id": task["task_id"]
                    })
                    stats["recurrences_materialized"] += 1
                    
        except Exception as e:
            Logger.error("ContinuousMonitoringAgent", "Monitoring run failed", exc=e)
            
        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)
        
        await db.system_events.insert_one({
            "event": "MONITORING_RUN_COMPLETED",
            "run_id": run_id,
            "duration_ms": duration_ms,
            "status": "SUCCESS",
            "stats": stats
        })
        
        Logger.info("ContinuousMonitoringAgent", f"Cycle {run_id} complete. Stats: {stats}")
        return stats

    @classmethod
    async def _record_gap(cls, db, gap_type: str, obligation_id: str, task_id: str):
        # Idempotent record
        existing = await db.compliance_gaps.find_one({
            "gap_type": gap_type,
            "obligation_id": obligation_id,
            "task_id": task_id,
            "resolved": {"$ne": True}
        })
        if not existing:
            gap = {
                "gap_id": f"GAP-{uuid.uuid4().hex[:8].upper()}",
                "gap_type": gap_type,
                "obligation_id": obligation_id,
                "task_id": task_id,
                "detected_at": datetime.utcnow(),
                "resolved": False
            }
            await db.compliance_gaps.insert_one(gap)
            await AuditLogService.append("COMPLIANCE_GAP_DETECTED", gap)
