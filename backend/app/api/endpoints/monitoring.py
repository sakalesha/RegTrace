from fastapi import APIRouter
from datetime import datetime, timedelta
from shared.database.mongodb import get_db
from agents.continuous_monitoring import ContinuousMonitoringAgent
from shared.services.audit import AuditLogService
from backend.app.auth.dependencies import require_role
from backend.app.auth.models import UserOut, UserRole
router = APIRouter()

@router.post("/monitoring/run")
async def run_monitoring_cycle(
    current_user: UserOut = Depends(require_role([UserRole.ADMIN]))
):
    """
    Manually triggers the Continuous Monitoring Agent.
    """
    stats = await ContinuousMonitoringAgent.run_cycle()
    return {"status": "success", "stats": stats}

@router.post("/monitoring/simulate-time")
async def simulate_time_passage(
    days: int = 10,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN]))
):
    import os
    if os.getenv("ENV", "development").lower() == "production":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Simulate time is not available in production.")
    """
    HACKATHON DEMO UTILITY: 
    Shifts all existing deadlines backwards by `days` so tasks become OVERDUE,
    and shifts created_at backwards so stale tasks trigger Gap Detection.
    """
    db = get_db()
    open_tasks = await db.compliance_tasks.find({"status": {"$in": ["OPEN", "IN_PROGRESS"]}}).to_list(None)
    
    modified_count = 0
    from dateutil.parser import parse as parse_date
    
    for task in open_tasks:
        updates = {}
        
        # Shift deadline
        deadline = task.get("deadline")
        if deadline:
            try:
                due_date = parse_date(deadline)
                new_due = due_date - timedelta(days=days)
                updates["deadline"] = new_due.isoformat()
            except:
                pass
                
        # Shift created_at
        created_at = task.get("created_at")
        if isinstance(created_at, datetime):
            updates["created_at"] = created_at - timedelta(days=days)
        elif isinstance(created_at, str):
            try:
                dt = parse_date(created_at)
                updates["created_at"] = (dt - timedelta(days=days)).isoformat()
            except:
                pass
                
        if updates:
            await db.compliance_tasks.update_one({"task_id": task["task_id"]}, {"$set": updates})
            modified_count += 1
            
    await AuditLogService.append("SIMULATE_TIME", {"days_shifted": days, "tasks_modified": modified_count}, actor=current_user.id)
    return {"status": "success", "message": f"Shifted time backward by {days} days for {modified_count} tasks."}

@router.post("/monitoring/verify-audit-chain")
async def verify_audit_chain(
    current_user: UserOut = Depends(require_role([UserRole.ADMIN]))
):
    """
    Admin utility to verify the tamper-evident hash chain.
    """
    result = await AuditLogService.verify_chain()
    return result
