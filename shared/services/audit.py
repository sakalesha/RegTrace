import hashlib
import json
from datetime import datetime
from shared.database.mongodb import get_db

class AuditLogService:
    """
    Centralized service for writing to the tamper-evident audit log.
    Ensures all state changes across agents form a cryptographically linked chain.
    """

    @classmethod
    async def append(cls, action: str, details: dict, actor: str = "system") -> dict:
        db = get_db()
        
        # 1. Fetch the last entry to get the previous hash and sequence
        last_entry = await db.audit_log.find_one(
            sort=[("seq", -1)]
        )
        
        seq = 1
        prev_hash = "GENESIS"
        
        if last_entry:
            seq = last_entry.get("seq", 0) + 1
            prev_hash = last_entry.get("hash", "GENESIS")
            
        timestamp = datetime.utcnow().isoformat()
        
        # 2. Compute the new hash: SHA256(prev_hash + action + actor + details + timestamp)
        # Sort keys to ensure deterministic JSON serialization
        details_str = json.dumps(details, sort_keys=True)
        raw_string = f"{prev_hash}|{action}|{actor}|{details_str}|{timestamp}"
        new_hash = hashlib.sha256(raw_string.encode('utf-8')).hexdigest()
        
        # 3. Construct and insert the new log entry
        log_entry = {
            "seq": seq,
            "action": action,
            "actor": actor,
            "details": details,
            "timestamp": timestamp,
            "prev_hash": prev_hash,
            "hash": new_hash
        }
        
        await db.audit_log.insert_one(log_entry)
        
        # Remove _id for cleaner return
        log_entry.pop("_id", None)
        return log_entry

    @classmethod
    async def verify_chain(cls) -> dict:
        """
        Admin utility to verify the integrity of the entire audit chain.
        Recalculates every hash from genesis to current to detect tampering.
        """
        db = get_db()
        cursor = db.audit_log.find().sort("seq", 1)
        
        expected_prev = "GENESIS"
        broken_at_seq = None
        
        async for entry in cursor:
            if entry.get("prev_hash") != expected_prev:
                broken_at_seq = entry.get("seq")
                break
                
            details_str = json.dumps(entry.get("details", {}), sort_keys=True)
            # Default to 'system' for older entries before actor was added
            actor = entry.get("actor", "system")
            raw_string = f"{expected_prev}|{entry.get('action')}|{actor}|{details_str}|{entry.get('timestamp')}"
            computed_hash = hashlib.sha256(raw_string.encode('utf-8')).hexdigest()
            
            if computed_hash != entry.get("hash"):
                broken_at_seq = entry.get("seq")
                break
                
            expected_prev = entry.get("hash")
            
        if broken_at_seq is not None:
            return {"status": "TAMPERED", "broken_at_sequence": broken_at_seq}
            
        return {"status": "INTACT", "message": "All chain hashes verified successfully."}
