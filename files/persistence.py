"""
RegTrace — Clause Segmentation Agent: MongoDB persistence adapter.

Writes are transactional per segmentation run: either all clauses for a
run are committed along with the run summary, or none are — this is what
guarantees a mid-run crash never leaves a half-segmented circular in the
database (see design doc, Section 9 — Failure Handling).

Requires a MongoDB replica-set-backed cluster (Atlas default) for
multi-document transactions.
"""

from __future__ import annotations
from typing import Any

from segmentation_core import SegmentationResult


class ClauseSegmentationPersistence:
    def __init__(self, db):
        """
        db: a pymongo Database instance (client.get_database("regtrace"))
        Expects collections: "clauses", "segmentation_runs", "audit_log".
        """
        self.db = db

    def save(self, result: SegmentationResult) -> dict:
        clauses_coll = self.db["clauses"]
        runs_coll = self.db["segmentation_runs"]
        audit_coll = self.db["audit_log"]

        session = self.db.client.start_session()
        try:
            with session.start_transaction():
                if result.clauses:
                    clauses_coll.insert_many(
                        [c.to_dict() for c in result.clauses], session=session
                    )
                runs_coll.insert_one(result.run.to_dict(), session=session)
                audit_coll.insert_one(
                    self._audit_entry(result), session=session
                )
            return {"status": "committed", "clause_count": len(result.clauses)}
        except Exception as exc:  # noqa: BLE001
            # Transaction auto-aborts on exception exit; report cleanly upward
            # rather than raising into the orchestrator uncaught.
            return {"status": "failed", "error": f"{type(exc).__name__}: {exc}"}
        finally:
            session.end_session()

    def _audit_entry(self, result: SegmentationResult) -> dict:
        prev = self.db["audit_log"].find_one(sort=[("seq", -1)])
        seq = (prev["seq"] + 1) if prev else 1
        prev_hash = prev["hash"] if prev else "0" * 14
        payload = f"{prev_hash}|CLAUSES_SEGMENTED|{result.run.circular_id}|{len(result.clauses)}"
        return {
            "seq": seq,
            "action": "CLAUSES_SEGMENTED",
            "details": {
                "circular_id": result.run.circular_id,
                "segmentation_run_id": result.run.run_id,
                "clause_count": len(result.clauses),
                "anomaly_count": len(result.run.anomalies),
            },
            "prev_hash": prev_hash,
            "hash": self._hash(payload),
        }

    @staticmethod
    def _hash(payload: str) -> str:
        import hashlib
        return hashlib.sha256(payload.encode()).hexdigest()[:14]


def ensure_indexes(db) -> None:
    """Call once at startup / deploy time."""
    db["clauses"].create_index([("circular_id", 1)])
    db["clauses"].create_index([("circular_id", 1), ("number", 1)])
    db["clauses"].create_index([("parent_clause_id", 1)])
    db["clauses"].create_index([("status", 1)])
    db["segmentation_runs"].create_index([("circular_id", 1), ("started_at", -1)])
