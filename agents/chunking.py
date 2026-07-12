import uuid
from langchain_text_splitters import RecursiveCharacterTextSplitter

from shared.database.mongodb import get_db
from shared.schemas.document import DocumentChunk
from shared.schemas.pipeline import ExecutionContext
from agents.base import BaseAgent
from shared.services.logger import Logger

class ChunkingAgent(BaseAgent):

    @classmethod
    async def execute(cls, context: ExecutionContext) -> ExecutionContext:
        document_id = context.document_id
        Logger.info("ChunkingAgent", f"Started for {document_id}")
        db = get_db()
        
        # 1. Fetch parsed nodes
        nodes = await db.parsed_nodes.find({"document_id": document_id}).sort("page_number", 1).to_list(length=None)
        
        if not nodes:
            raise ValueError(f"No parsed nodes found for {document_id}")
            
        Logger.info("ChunkingAgent", f"Splitting {len(nodes)} document nodes into semantic chunks...")
        
        # 2. Configure semantic chunking
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        
        chunk_records = []
        global_chunk_index = 0
        
        for node in nodes:
            chunks = text_splitter.split_text(node["content"])
            
            for chunk_text in chunks:
                chunk_id = f"CHK-{uuid.uuid4().hex[:8].upper()}"
                record = DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    chunk_index=global_chunk_index,
                    text=chunk_text,
                    page=node.get("page_number"),
                    heading=node.get("heading"),
                    section=node.get("section"),
                    parent_section=None,
                    status="CHUNKED"
                )
                chunk_records.append(record.model_dump())
                global_chunk_index += 1
                
        Logger.info("ChunkingAgent", f"Created {len(chunk_records)} semantic chunks.")
        
        # 3. Store chunks in MongoDB
        if chunk_records:
            await db.document_chunks.insert_many(chunk_records)
            
        # 4. Update Document Status
        await db.raw_documents.update_one(
            {"document_id": document_id},
            {"$set": {"status": "CHUNKED"}}
        )
        
        return context
