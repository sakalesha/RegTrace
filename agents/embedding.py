import asyncio
from sentence_transformers import SentenceTransformer
from qdrant_client.models import PointStruct

from shared.database.mongodb import get_db
from shared.database.vector_db import VectorDBManager
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger

class EmbeddingAgent(BaseAgent):
    
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            Logger.info("EmbeddingAgent", "Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
            cls._model = SentenceTransformer('all-MiniLM-L6-v2')
        return cls._model

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("EmbeddingAgent", f"Started for {document_id}")
        db = get_db()
        qdrant = VectorDBManager.get_client()
        collection_name = VectorDBManager.COLLECTION_NAME
        
        # 1. Fetch chunks
        chunks = await db.document_chunks.find({"document_id": document_id, "status": "CHUNKED"}).to_list(length=None)
        
        if not chunks:
            Logger.warning("EmbeddingAgent", f"No chunks found for {document_id}")
            return context
            
        Logger.info("EmbeddingAgent", f"Embedding {len(chunks)} chunks...")
        
        # 2. Generate embeddings
        model = cls.get_model()
        texts = [chunk["text"] for chunk in chunks]
        
        # Run embedding generation synchronously but non-blocking (offloaded to thread pool ideally, 
        # but for now running directly since it's local inference)
        embeddings = model.encode(texts)
        
        # 3. Prepare payload for Qdrant
        points = []
        for i, chunk in enumerate(chunks):
            points.append(
                PointStruct(
                    id=chunk["chunk_id"],  # using chunk_id string directly, Qdrant supports UUIDs/Strings
                    vector=embeddings[i].tolist(),
                    payload={
                        "document_id": document_id,
                        "chunk_index": chunk.get("chunk_index", 0),
                        "text": chunk.get("text", ""),
                        "page": chunk.get("page"),
                        "heading": chunk.get("heading"),
                        "section": chunk.get("section")
                    }
                )
            )
            
        # 4. Upsert to Vector DB
        Logger.info("EmbeddingAgent", f"Upserting vectors into Qdrant collection '{collection_name}'...")
        qdrant.upsert(
            collection_name=collection_name,
            points=points
        )
        
        # 5. Update MongoDB status
        chunk_ids = [chunk["_id"] for chunk in chunks]
        await db.document_chunks.update_many(
            {"_id": {"$in": chunk_ids}},
            {"$set": {"status": "EMBEDDED"}}
        )
        
        await db.raw_documents.update_one(
            {"document_id": document_id},
            {"$set": {"status": "EMBEDDED"}}
        )
        
        return context
