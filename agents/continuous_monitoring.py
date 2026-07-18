import uuid
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_date
from dateutil.relativedelta import relativedelta
from shared.database.mongodb import get_db
from shared.services.logger import Logger
from shared.services.audit import AuditLogService
from backend.app.monitoring.gap_detection import run_gap_checks

class ContinuousMonitoringAgent:
    """
    Background agent that scans the tasks collection to:
    1. Detect overdue tasks and escalate priorities.
    2. Detect compliance gaps (e.g., approved obligations with no tasks).
    3. Materialize the next occurrence of recurring tasks.
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
        
        await db.monitoring_runs.insert_one({
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
                if not deadline_str:
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

            # 2. Gap Detection
            stats["gaps_detected"] = await run_gap_checks(run_id)

            # 3. Recurrence Generation
            completed_tasks = await db.compliance_tasks.find({"status": "COMPLETED"}).to_list(None)
            for task in completed_tasks:
                frequency = task.get("frequency")
                if not frequency or frequency.lower() in ["none", "one time", ""]:
                    continue
                    
                # Use upsert to atomically insert the next occurrence only if it doesn't exist
                new_task_id = f"TSK-{uuid.uuid4().hex[:8].upper()}"
                
                new_due = None
                if task.get("deadline"):
                    try:
                        old_due = parse_date(task["deadline"])
                        if "year" in frequency.lower() or "annual" in frequency.lower():
                            new_due = old_due + relativedelta(years=1)
                        elif "quarter" in frequency.lower():
                            new_due = old_due + relativedelta(months=3)
                        elif "month" in frequency.lower():
                            new_due = old_due + relativedelta(months=1)
                        
                        if new_due:
                            new_due = new_due.isoformat()
                    except:
                        pass
                
                if not new_due:
                    from shared.services.audit import AuditLogService
                    await AuditLogService.append("RECURRENCE_VALIDATION_GAP", {
                        "reason": "Missing or unparsable deadline/frequency",
                        "task_id": task.get("task_id"),
                        "obligation_id": task.get("obligation_id")
                    })
                    continue
                
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
                    "created_at": datetime.utcnow(),
                    "deadline": new_due
                }
                
                result = await db.compliance_tasks.update_one(
                    {
                        "obligation_id": task["obligation_id"],
                        "previous_occurrence_id": task["task_id"]
                    },
                    {"$setOnInsert": new_task},
                    upsert=True
                )
                
                if result.upserted_id:
                    await AuditLogService.append("TASK_RECURRENCE_GENERATED", {
                        "task_id": new_task_id,
                        "parent_task_id": task["task_id"]
                    })
                    stats["recurrences_materialized"] += 1
                    
        except Exception as e:
            Logger.error("ContinuousMonitoringAgent", "Monitoring run failed", exc=e)
            end_time = datetime.utcnow()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)
            await db.monitoring_runs.insert_one({
                "event": "MONITORING_RUN_COMPLETED",
                "run_id": run_id,
                "duration_ms": duration_ms,
                "status": "FAILED",
                "error": str(e),
                "stats": stats
            })
            raise e
            
        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)
        
        await db.monitoring_runs.insert_one({
            "event": "MONITORING_RUN_COMPLETED",
            "run_id": run_id,
            "duration_ms": duration_ms,
            "status": "SUCCESS",
            "stats": stats
        })
        
        Logger.info("ContinuousMonitoringAgent", f"Cycle {run_id} complete. Stats: {stats}")
        return stats
