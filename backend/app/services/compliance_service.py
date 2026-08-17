import logging
from collections import defaultdict
from typing import Dict, List, Any, Optional

from app.db.mongodb import db
from app.schemas.compliance import (
    ComplianceStatus,
    ObligationCompliance,
    ComplianceBreakdownItem,
    CriticalGap,
    ComplianceOverview,
)

logger = logging.getLogger("compliance")

COMPLETED = "COMPLETED"
OVERDUE = "OVERDUE"
CANCELLED = "CANCELLED"
ACCEPTED = "ACCEPTED"


class ComplianceService:
    """Derives real compliance status from the obligation -> task -> evidence chain."""

    async def get_overview(self) -> ComplianceOverview:
        database = db.get_db()
        obligations = await self._load_obligations(database)
        obligation_ids = [o["_id"] for o in obligations]
        tasks_by_obl, evs_by_obl = await self._load_links(database, obligation_ids)

        items = [
            self._compute(o, tasks_by_obl.get(o["_id"], []), evs_by_obl.get(o["_id"], []))
            for o in obligations
        ]

        status_counts = defaultdict(int)
        for it in items:
            status_counts[it.status.value] += 1

        total = len(items)
        compliant = status_counts[ComplianceStatus.COMPLIANT.value]
        overall_score = round(100.0 * compliant / total, 1) if total else 0.0

        critical_gaps = [
            CriticalGap(
                obligation_id=it.obligation_id,
                action=it.action,
                department=it.department,
                status=it.status,
                is_overdue=it.is_overdue,
                is_mandatory=it.is_mandatory,
            )
            for it in items
            if it.status != ComplianceStatus.COMPLIANT and (it.is_mandatory or it.is_overdue)
        ][:10]

        return ComplianceOverview(
            overall_score=overall_score,
            total_obligations=total,
            status_counts=dict(status_counts),
            by_department=self._breakdown(items, "department"),
            by_category=self._breakdown(items, "category"),
            by_priority=self._breakdown(items, "priority"),
            critical_gaps=critical_gaps,
        )

    async def get_obligations_compliance(
        self, filters: Dict[str, Any]
    ) -> List[ObligationCompliance]:
        database = db.get_db()
        obligations = await self._load_obligations(database, filters)
        obligation_ids = [o["_id"] for o in obligations]
        tasks_by_obl, evs_by_obl = await self._load_links(database, obligation_ids)
        return [
            self._compute(o, tasks_by_obl.get(o["_id"], []), evs_by_obl.get(o["_id"], []))
            for o in obligations
        ]

    # ---- internals ----

    async def _load_obligations(self, database, filters=None) -> List[Dict[str, Any]]:
        flt = filters or {}
        cursor = database.obligations.find(flt)
        out = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            out.append(doc)
        return out

    async def _load_links(self, database, obligation_ids):
        tasks_by_obl = defaultdict(list)
        evs_by_obl = defaultdict(list)
        if obligation_ids:
            tcur = database.tasks.find({"obligation_id": {"$in": obligation_ids}})
            async for t in tcur:
                tasks_by_obl[t.get("obligation_id")].append(t)
            ecur = database.evidence.find({"obligation_id": {"$in": obligation_ids}})
            async for e in ecur:
                evs_by_obl[e.get("obligation_id")].append(e)
        return tasks_by_obl, evs_by_obl

    def _compute(self, o, tasks, evs) -> ObligationCompliance:
        oid = o["_id"]
        action = o.get("action", "")
        actor = o.get("actor", "")
        is_mandatory = bool(o.get("is_mandatory", False))
        deadline = o.get("deadline")
        ostatus = o.get("status", "PENDING")

        active = [t for t in tasks if t.get("status") != CANCELLED]
        completed = [t for t in tasks if t.get("status") == COMPLETED]
        accepted = [e for e in evs if e.get("status") == ACCEPTED]
        is_overdue = any(t.get("status") == OVERDUE for t in tasks)

        rep = active[0] if active else (tasks[0] if tasks else None)
        department = rep.get("assigned_department") or rep.get("recommended_owner") if rep else None
        category = rep.get("category") if rep else None
        priority = rep.get("priority") if rep else None

        # Each active task that requires evidence must have >=1 ACCEPTED evidence
        # linked to that task for the obligation to count as fully compliant.
        evidence_req_tasks = [t for t in active if (t.get("evidence_required") or [])]
        evidence_covered = True
        if evidence_req_tasks:
            accepted_task_ids = {e.get("task_id") for e in accepted}
            for t in evidence_req_tasks:
                if t.get("_id") not in accepted_task_ids:
                    evidence_covered = False
                    break

        if ostatus == "REJECTED":
            status = ComplianceStatus.NON_COMPLIANT
        elif ostatus != "APPROVED":
            status = ComplianceStatus.NOT_STARTED
        else:
            if not tasks:
                status = ComplianceStatus.NOT_STARTED
            elif all(t.get("status") == COMPLETED for t in active) and evidence_covered:
                status = ComplianceStatus.COMPLIANT
            elif completed or accepted:
                status = ComplianceStatus.PARTIALLY_COMPLIANT
            else:
                status = ComplianceStatus.NON_COMPLIANT

        return ObligationCompliance(
            obligation_id=oid,
            document_id=o.get("document_id", ""),
            action=action,
            actor=actor,
            is_mandatory=is_mandatory,
            deadline=deadline,
            status=status,
            is_overdue=is_overdue,
            tasks_total=len(tasks),
            tasks_completed=len(completed),
            evidence_total=len(evs),
            evidence_accepted=len(accepted),
            department=department,
            category=category,
            priority=priority,
        )

    def _breakdown(self, items, attr) -> List[ComplianceBreakdownItem]:
        groups = defaultdict(list)
        for it in items:
            key = (getattr(it, attr) or "Unknown")
            groups[key].append(it)
        out = []
        for key, group in groups.items():
            c = sum(1 for g in group if g.status == ComplianceStatus.COMPLIANT)
            p = sum(1 for g in group if g.status == ComplianceStatus.PARTIALLY_COMPLIANT)
            n = sum(1 for g in group if g.status == ComplianceStatus.NON_COMPLIANT)
            ns = sum(1 for g in group if g.status == ComplianceStatus.NOT_STARTED)
            total = len(group)
            score = round(100.0 * c / total, 1) if total else 0.0
            out.append(
                ComplianceBreakdownItem(
                    key=key,
                    total=total,
                    compliant=c,
                    partial=p,
                    non_compliant=n,
                    not_started=ns,
                    score=score,
                )
            )
        out.sort(key=lambda x: -x.total)
        return out
