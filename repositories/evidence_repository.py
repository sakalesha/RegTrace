import asyncio
from concurrent.futures import ThreadPoolExecutor
from shared.database.mongodb import get_db
from shared.config.settings import settings

_model = None
_executor = ThreadPoolExecutor(max_workers=2)

def _get_and_encode(query_text: str) -> list:
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model.encode([query_text])[0].tolist()

class EvidenceRepository:
    
    @classmethod
    async def search_vectors(cls, query_text: str, limit: int = 3, metadata_filters: dict = None):
        try:
            loop = asyncio.get_running_loop()
            query_vector = await loop.run_in_executor(_executor, _get_and_encode, query_text)
            
            db = get_db()
            
            search_stage = {
                "$vectorSearch": {
                    "index": settings.vector_index_name,
                    "path": settings.vector_field_name,
                    "queryVector": query_vector,
                    "numCandidates": limit * 10,
                    "limit": limit
                }
            }
            
            if metadata_filters:
                search_stage["$vectorSearch"]["filter"] = metadata_filters
                
            pipeline = [search_stage]
            
            cursor = db[settings.vector_collection_name].aggregate(pipeline)
            search_result = await cursor.to_list(length=limit)
            return search_result
        except Exception:
            return []
