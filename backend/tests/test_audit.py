"""Tests for the audit logging module (schema + service with a fake DB)."""
import asyncio
import pytest

from app.schemas.audit import AuditLogEntry, AuditLogListResponse
from app.services import audit_service


class _FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, *a, **k):
        return self

    def limit(self, n):
        self.docs = self.docs[:n]
        return self

    def __aiter__(self):
        self._it = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._it)
        except StopIteration:
            raise StopAsyncIteration


class _FakeCollection:
    def __init__(self):
        self.store = []

    async def insert_one(self, doc):
        doc.setdefault("_id", "generated-id")
        self.store.append(doc)

    def find(self, query=None, projection=None):
        docs = list(self.store)
        if query and "document_id" in query:
            docs = [d for d in docs if d.get("document_id") == query["document_id"]]
        return _FakeCursor(docs)


class _FakeDB:
    def __init__(self):
        self.audit_logs = _FakeCollection()


@pytest.fixture
def fake_db(monkeypatch):
    db = _FakeDB()
    monkeypatch.setattr(audit_service.db, "get_db", lambda: db)
    return db


class TestAuditSchema:
    def test_entry_round_trip(self):
        entry = AuditLogEntry(event_type="X", document_id="d1", actor="u", meta={"a": 1})
        dumped = entry.model_dump()
        assert dumped["event_type"] == "X"
        assert dumped["meta"]["a"] == 1

    def test_list_response(self):
        resp = AuditLogListResponse(total=1, results=[AuditLogEntry(event_type="Y")])
        assert resp.total == 1


class TestAuditService:
    def test_log_event_persists(self, fake_db):
        asyncio.run(
            audit_service.log_event("EVT", document_id="d1", actor="u", meta={"k": 2})
        )
        logs = asyncio.run(audit_service.get_logs())
        assert len(logs) == 1
        assert logs[0]["event_type"] == "EVT"
        assert logs[0]["document_id"] == "d1"
        assert logs[0]["_id"] == "generated-id"

    def test_get_logs_filters_by_document(self, fake_db):
        asyncio.run(audit_service.log_event("A", document_id="d1"))
        asyncio.run(audit_service.log_event("B", document_id="d2"))
        d1 = asyncio.run(audit_service.get_logs(document_id="d1"))
        assert len(d1) == 1 and d1[0]["document_id"] == "d1"

    def test_log_event_never_raises_on_bad_db(self, monkeypatch):
        monkeypatch.setattr(
            audit_service.db, "get_db", lambda: (_ for _ in ()).throw(RuntimeError("boom"))
        )
        # Should swallow the error, not raise.
        asyncio.run(audit_service.log_event("X"))
