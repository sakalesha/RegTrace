from app.db.mongodb import db
from app.models.clause import ClauseModel
from typing import List, Optional

class ClauseService:
    @staticmethod
    async def create_clauses(clauses: List[ClauseModel]):
        database = db.get_db()
        if not clauses:
            return
            
        clauses_dict = [clause.dict(by_alias=True) for clause in clauses]
        await database["clauses"].insert_many(clauses_dict)
        
    @staticmethod
    async def get_clauses_by_document(document_id: str) -> List[ClauseModel]:
        database = db.get_db()
        cursor = database["clauses"].find({"document_id": document_id}).sort("clause_id", 1)
        clauses = []
        async for doc in cursor:
            clauses.append(ClauseModel(**doc))
        return clauses
        
    @staticmethod
    async def delete_clauses_by_document(document_id: str):
        database = db.get_db()
        await database["clauses"].delete_many({"document_id": document_id})
