import logging
from collections import defaultdict
from typing import Dict, List, Any, Optional

from app.db.mongodb import db
from app.schemas.gap import (
    GapType,
    GapSeverity,
    GapItem,
    GapSummaryBucket,
    GapOverview,
)

logger = logging.getLogger("gap")

CANCELLED = "CANCELLED"
OVERDUE = "OVERDUE"
SUBMITTED = "SUBMITTED"
ACCEPTED = "ACCEPTED"
REJECTED = "REJECTED"

SEVERITY_RANK = {
    GapSeverity.CRITICAL: 0,
    GapSeverity.HIGH: 1,
    GapSeverity.MEDIUM: 2,
    GapSeverity.LOW: 3,
}


class GapService:
    """Enumerates concrete, task-level compliance gaps with severity and remediation."""

    async def get_overview(self, document_id: Optional[str] = None) -> GapOverview:
        filters = {"document_id": document_id} if document_id else {}
        items = await self.get_gap_items(filters)
        return self._summarize(items)

    async def get_gap_items(self, filters: Dict[str, Any]) -> List[GapItem]:
        database = db.get_db()
        obligations = await self._load_obligations(database)
        obligation_ids = [o["_id"] for o in obligations]
        tasks_by_obl, evs_by_obl = await self._load_links(database, obligation_ids)

        items: List[GapItem] = []
        for o in obligations:
            items.extend(self._classify(o, tasks_by_obl.get(o["_id"], []), evs_by_obl.get(o["_id"], [])))

        if filters.get("severity"):
            target = filters["severity"].upper()
            items = [i for i in items if i.severity.value == target]
        if filters.get("type"):
            target = filters["type"].upper()
            items = [i for i in items if i.gap_type.value == target]
        if filters.get("department"):
            dep = filters["department"].lower()
            items = [i for i in items if (i.department or "").lower() == dep]

        return items

    # ---- internals ----

    async def _load_obligations(self, database) -> List[Dict[str, Any]]:
        out = []
        async for doc in database.obligations.find({}):
            doc["_id"] = str(doc["_id"])
            out.append(doc)
        return out

    async def _load_links(self, database, obligation_ids):
        tasks_by_obl = defaultdict(list)
        evs_by_obl = defaultdict(list)
        if obligation_ids:
            tcur = database.tasks.find({"obligation_id": {"$in": obligation_ids}})
            async for t in tcur:
                t["_id"] = str(t["_id"])
                tasks_by_obl[t.get("obligation_id")].append(t)
            ecur = database.evidence.find({"obligation_id": {"$in": obligation_ids}})
            async for e in ecur:
                e["_id"] = str(e["_id"])
                evs_by_obl[e.get("obligation_id")].append(e)
        return tasks_by_obl, evs_by_obl

    def _classify(self, o, tasks, evs) -> List[GapItem]:
        oid = o["_id"]
        action = o.get("action", "")
        actor = o.get("actor", "")
        is_mandatory = bool(o.get("is_mandatory", False))
        ostatus = o.get("status", "PENDING")
        rep = tasks[0] if tasks else None
        department = (rep or {}).get("assigned_department") or (rep or {}).get("recommended_owner")
        category = (rep or {}).get("category")
        priority = (rep or {}).get("priority")
        items: List[GapItem] = []

        def mk(gap_type, severity, desc, rec, task=None, overdue=False):
            return GapItem(
                gap_id=f"{oid}:{gap_type.value}:{(task or {}).get('_id', '')}",
                obligation_id=oid,
                obligation_action=action,
                actor=actor,
                task_id=(task or {}).get("_id"),
                task_title=(task or {}).get("title"),
                gap_type=gap_type,
                severity=severity,
                department=department,
                category=category,
                priority=priority,
                is_mandatory=is_mandatory,
                is_overdue=overdue,
                description=desc,
                recommended_action=rec,
            )

        if ostatus == "REJECTED":
            items.append(
                mk(
                    GapType.OBLIGATION_REJECTED,
                    GapSeverity.HIGH if is_mandatory else GapSeverity.LOW,
                    f"Obligation '{action}' was rejected and has no active compliance path.",
                    "Re-review the obligation or remove it from scope if not applicable.",
                )
            )
            return items

        if ostatus != "APPROVED":
            items.append(
                mk(
                    GapType.OBLIGATION_NOT_REVIEWED,
                    GapSeverity.HIGH if is_mandatory else GapSeverity.LOW,
                    f"Obligation '{action}' is {ostatus} and has not been approved yet.",
                    "Review and approve the obligation to start operationalization.",
                )
            )
            return items

        active = [t for t in tasks if t.get("status") != CANCELLED]
        if not active:
            items.append(
                mk(
                    GapType.NO_TASKS_GENERATED,
                    GapSeverity.HIGH if is_mandatory else GapSeverity.MEDIUM,
                    f"Approved obligation '{action}' has no operational tasks generated.",
                    "Generate and assign compliance tasks for this obligation.",
                )
            )
            return items

        evs_by_task = defaultdict(list)
        for e in evs:
            evs_by_task[e.get("task_id")].append(e)

        for t in active:
            tstatus = t.get("status")
            tprio = (t.get("priority") or "").upper()
            tdep = t.get("assigned_department") or t.get("recommended_owner")
            overdue = tstatus == OVERDUE

            if tstatus == "PENDING_ASSIGNMENT":
                items.append(
                    mk(
                        GapType.TASK_UNASSIGNED,
                        self._derive_sev(is_mandatory, overdue, tprio),
                        f"Task '{t.get('title')}' is created but not assigned to a department.",
                        f"Assign the task to {tdep or 'the responsible department'}.",
                        task=t,
                        overdue=overdue,
                    )
                )
                continue

            if tstatus in ("ASSIGNED", "IN_PROGRESS"):
                items.append(
                    mk(
                        GapType.TASK_NOT_STARTED,
                        self._derive_sev(is_mandatory, overdue, tprio),
                        f"Task '{t.get('title')}' is {tstatus.lower().replace('_', ' ')} and not yet complete.",
                        "Drive the task to completion and record progress.",
                        task=t,
                        overdue=overdue,
                    )
                )

            if overdue:
                items.append(
                    mk(
                        GapType.TASK_OVERDUE,
                        GapSeverity.CRITICAL if (is_mandatory or tprio == "CRITICAL") else GapSeverity.HIGH,
                        f"Task '{t.get('title')}' is overdue.",
                        "Escalate and complete the overdue task immediately.",
                        task=t,
                        overdue=True,
                    )
                )

            # Evidence gaps for tasks that require evidence
            req = t.get("evidence_required") or []
            if req:
                task_evs = evs_by_task.get(t.get("_id"), [])
                has_accepted = any(e.get("status") == ACCEPTED for e in task_evs)
                has_rejected = any(e.get("status") == REJECTED for e in task_evs)
                has_submitted = any(e.get("status") == SUBMITTED for e in task_evs)

                if not task_evs:
                    items.append(
                        mk(
                            GapType.EVIDENCE_MISSING,
                            self._derive_sev(is_mandatory, overdue, tprio),
                            f"Task '{t.get('title')}' requires evidence ({', '.join(req)}) but none submitted.",
                            "Collect and submit the required evidence.",
                            task=t,
                            overdue=overdue,
                        )
                    )
                elif has_rejected and not has_accepted:
                    items.append(
                        mk(
                            GapType.EVIDENCE_REJECTED,
                            GapSeverity.HIGH if (is_mandatory or overdue) else GapSeverity.MEDIUM,
                            f"Evidence for task '{t.get('title')}' was rejected and needs resubmission.",
                            "Review rejection reason and resubmit corrected evidence.",
                            task=t,
                            overdue=overdue,
                        )
                    )
                elif has_submitted and not has_accepted:
                    items.append(
                        mk(
                            GapType.EVIDENCE_SUBMITTED_PENDING,
                            GapSeverity.MEDIUM,
                            f"Evidence for task '{t.get('title')}' is submitted and pending acceptance.",
                            "Follow up on evidence review and acceptance.",
                            task=t,
                            overdue=overdue,
                        )
                    )

        return items

    def _derive_sev(self, is_mandatory, overdue, priority) -> GapSeverity:
        priority = (priority or "").upper()
        if (is_mandatory and overdue) or priority == "CRITICAL":
            return GapSeverity.CRITICAL
        if is_mandatory or overdue or priority == "HIGH":
            return GapSeverity.HIGH
        if priority == "MEDIUM":
            return GapSeverity.MEDIUM
        return GapSeverity.LOW

    def _summarize(self, items: List[GapItem]) -> GapOverview:
        by_sev = {s.value: 0 for s in GapSeverity}
        for i in items:
            by_sev[i.severity.value] += 1

        type_buckets = self._bucket(items, lambda i: i.gap_type.value)
        dept_buckets = self._bucket(items, lambda i: (i.department or "Unassigned"))

        ranked = sorted(
            items,
            key=lambda i: (SEVERITY_RANK.get(i.severity, 9), not i.is_mandatory, not i.is_overdue),
        )
        top = ranked[:8]

        return GapOverview(
            total_gaps=len(items),
            by_severity=by_sev,
            by_type=type_buckets,
            by_department=dept_buckets,
            top_priority_gaps=top,
        )

    def _bucket(self, items, keyfn) -> List[GapSummaryBucket]:
        groups = defaultdict(list)
        for i in items:
            groups[keyfn(i)].append(i)
        out = []
        for key, group in groups.items():
            out.append(
                GapSummaryBucket(
                    key=key,
                    total=len(group),
                    critical=sum(1 for g in group if g.severity == GapSeverity.CRITICAL),
                    high=sum(1 for g in group if g.severity == GapSeverity.HIGH),
                    medium=sum(1 for g in group if g.severity == GapSeverity.MEDIUM),
                    low=sum(1 for g in group if g.severity == GapSeverity.LOW),
                )
            )
        out.sort(key=lambda b: -b.total)
        return out
