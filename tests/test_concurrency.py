import pytest
import asyncio
from datetime import datetime
from fastapi import Request, HTTPException
from pymongo.errors import DuplicateKeyError

from shared.database.mongodb import get_db
from shared.services.audit import AuditLogService
from backend.app.auth.dependencies import rate_limit

# Mock Request
class MockClient:
    def __init__(self, host):
        self.host = host

class MockRequest(Request):
    def __init__(self, ip):
        self._client = MockClient(ip)
    
    @property
    def client(self):
        return self._client

@pytest.mark.asyncio
async def test_rate_limit_concurrency():
    import uuid
    ip = f"192.168.1.{uuid.uuid4().hex[:6]}"
    max_reqs = 5
    limiter = rate_limit(max_requests=max_reqs, window_seconds=60)
    
    db = get_db()
    
    # Ensure index exists before running requests
    await db.rate_limits.create_index("ip", unique=True)
    
    async def make_request():
        req = MockRequest(ip)
        try:
            await limiter(req)
            return True
        except HTTPException:
            return False

    try:
        # Fire 10 concurrent requests
        results = await asyncio.gather(*[make_request() for _ in range(10)])
    finally:
        # Cleanup
        await db.rate_limits.delete_many({"ip": ip})
    
    successes = sum(1 for r in results if r)
    failures = sum(1 for r in results if not r)
    
    assert successes == max_reqs, f"Expected {max_reqs} successes, got {successes}"
    assert failures == 10 - max_reqs, f"Expected {10 - max_reqs} failures, got {failures}"
    
    # Verify index exists
    indexes = await db.rate_limits.index_information()
    assert any(idx.get("key") == [("ip", 1)] and idx.get("unique") for idx in indexes.values()), "Unique index on ip is missing"

@pytest.mark.asyncio
async def test_audit_log_concurrency():
    import uuid
    db = get_db()
    
    run_id = f"test_run_{uuid.uuid4().hex}"
    
    async def transaction_task(actor_id):
        async with await db.client.start_session() as session:
            async def callback(sess):
                await AuditLogService.append("CONCURRENT_TEST", {"run_id": run_id}, actor=actor_id, session=sess)
                return True
            await session.with_transaction(callback)
            return True

    # Run two concurrently
    results = await asyncio.gather(
        transaction_task("actor_1"),
        transaction_task("actor_2"),
        return_exceptions=True
    )
    
    for r in results:
        assert not isinstance(r, Exception), f"Audit Log Test Failed with Exception: {r}"
            
    # Verify the sequence in DB
    cursor = db.audit_log.find({"action": "CONCURRENT_TEST", "details.run_id": run_id}).sort("seq", -1)
    entries = await cursor.to_list(None)
    
    assert len(entries) == 2, "Expected 2 entries for this test run"
    assert entries[0]["seq"] != entries[1]["seq"], "Expected distinct sequence numbers"
