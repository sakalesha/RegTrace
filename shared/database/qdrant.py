from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams

class QdrantManager:
    client: QdrantClient = None
    collection_name = "document_chunks"
    
    @classmethod
    def connect(cls):
        # Use local disk database for zero setup
        cls.client = QdrantClient(path="local_qdrant_db")
        
        # Ensure collection exists
        if not cls.client.collection_exists(collection_name=cls.collection_name):
            cls.client.create_collection(
                collection_name=cls.collection_name,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            
    @classmethod
    def get_client(cls) -> QdrantClient:
        if not cls.client:
            cls.connect()
        return cls.client
