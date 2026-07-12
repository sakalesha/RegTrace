from qdrant_client.models import Filter, FieldCondition, MatchValue
from shared.database.vector_db import VectorDBManager

class EvidenceRepository:
    
    @classmethod
    def search_vectors(cls, query_text: str, limit: int = 3, metadata_filters: dict = None):
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            query_vector = model.encode([query_text])[0].tolist()
            
            client = VectorDBManager.get_client()
            collection_name = VectorDBManager.COLLECTION_NAME
            
            qdrant_filter = None
            if metadata_filters:
                conditions = []
                for k, v in metadata_filters.items():
                    conditions.append(FieldCondition(key=k, match=MatchValue(value=v)))
                qdrant_filter = Filter(must=conditions)
                
            search_result = client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                query_filter=qdrant_filter,
                limit=limit
            )
            return search_result
        except Exception:
            return []
