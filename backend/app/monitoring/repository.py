from typing import List, Dict, Any, Optional
from datetime import datetime
from shared.database.mongodb import get_db
from backend.app.monitoring.models import GapType
from pymongo import ReturnDocument

class GapRepository:
    
    @classmethod
    async def get_gaps(cls, gap_type: Optional[str] = None, resolved: Optional[bool] = False, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        db = get_db()
        query = {}
        if gap_type:
            query["gap_type"] = gap_type
        if resolved is not None:
            query["resolved"] = resolved
            
        cursor = db.compliance_gaps.find(query).sort("detected_at", -1).skip(skip).limit(limit)
        gaps = await cursor.to_list(length=limit)
        for g in gaps:
            g["_id"] = str(g["_id"])
        return gaps
        
    @classmethod
    async def get_gap_summary(cls) -> Dict[str, Any]:
        db = get_db()
        pipeline = [
            {"$match": {"resolved": False}},
            {"$group": {"_id": "$gap_type", "count": {"$sum": 1}}}
        ]
        
        counts = await db.compliance_gaps.aggregate(pipeline).to_list(None)
        
        by_type = {g.value: 0 for g in GapType}
        total = 0
        for doc in counts:
            gtype = doc["_id"]
            count = doc["count"]
            by_type[gtype] = count
            total += count
            
        return {
            "total_open": total,
            "by_type": by_type
        }

    @classmethod
    async def resolve_gap(cls, gap_id: str, resolved_by: str, resolution_note: str) -> Optional[Dict[str, Any]]:
        db = get_db()
        # Conditional update matching resolved: False to prevent double-resolutions
        updated_doc = await db.compliance_gaps.find_one_and_update(
            {"gap_id": gap_id, "resolved": False},
            {
                "$set": {
                    "resolved": True,
                    "resolved_at": datetime.utcnow(),
                    "resolved_by": resolved_by,
                    "resolution_note": resolution_note
                }
            },
            return_document=ReturnDocument.AFTER
        )
        if updated_doc:
            updated_doc["_id"] = str(updated_doc["_id"])
        return updated_doc

    @classmethod
    async def create_indexes(cls):
        db = get_db()
        await db.compliance_gaps.create_index("gap_type")
        await db.compliance_gaps.create_index("resolved")
        await db.compliance_gaps.create_index("obligation_id")
        await db.compliance_gaps.create_index("task_id")
        await db.compliance_gaps.create_index("detected_at")
        await db.compliance_gaps.create_index(
            [("gap_type", 1), ("obligation_id", 1), ("task_id", 1), ("resolved", 1)]
        )
