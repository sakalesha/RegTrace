import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.db.mongodb import db

logger = logging.getLogger("audit")


async def log_event(
    event_type: str,
    document_id: Optional[str] = None,
    actor: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """Append an immutable-ish audit record. Best-effort: never raises."""
    try:
        database = db.get_db()
        await database.audit_logs.insert_one(
            {
                "event_type": event_type,
                "document_id": document_id,
                "actor": actor,
                "meta": meta or {},
                "created_at": datetime.utcnow(),
            }
        )
    except Exception as e:  # pragma: no cover - logging must never break the flow
        logger.warning("audit log_event failed for %s: %s", event_type, e)


async def get_logs(document_id: Optional[str] = None, limit: int = 100) -> List[dict]:
    """Return audit records newest-first. Optionally filtered by document."""
    database = db.get_db()
    query: Dict[str, Any] = {}
    if document_id:
        query["document_id"] = document_id
    cursor = database.audit_logs.find(query).sort("created_at", -1).limit(limit)
    out: List[dict] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        out.append(doc)
    return out
