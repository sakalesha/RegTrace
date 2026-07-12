from shared.database.neo4j_manager import Neo4jManager
from shared.services.logger import Logger

class GraphRepository:

    @classmethod
    def create_document(cls, document_id: str, title: str):
        query = """
        MERGE (d:Document {document_id: $document_id})
        ON CREATE SET d.title = $title
        RETURN d
        """
        Neo4jManager.execute_query(query, {"document_id": document_id, "title": title})
        
    @classmethod
    def create_chunk(cls, chunk_id: str, document_id: str, page: int, heading: str, section: str):
        query = """
        MERGE (c:Chunk {chunk_id: $chunk_id})
        ON CREATE SET c.document_id = $document_id, c.page = $page, c.heading = $heading, c.section = $section
        WITH c
        MATCH (d:Document {document_id: $document_id})
        MERGE (d)-[:CONTAINS]->(c)
        RETURN c
        """
        Neo4jManager.execute_query(query, {
            "chunk_id": chunk_id, "document_id": document_id, 
            "page": page, "heading": heading, "section": section
        })

    @classmethod
    def create_obligation(cls, obligation_id: str, chunk_id: str, title: str, actor: str, action: str):
        query = """
        MERGE (o:Obligation {obligation_id: $obligation_id})
        ON CREATE SET o.title = $title, o.actor = $actor, o.action = $action
        WITH o
        MATCH (c:Chunk {chunk_id: $chunk_id})
        MERGE (c)-[:HAS_OBLIGATION]->(o)
        RETURN o
        """
        Neo4jManager.execute_query(query, {
            "obligation_id": obligation_id, "chunk_id": chunk_id,
            "title": title, "actor": actor, "action": action
        })
        
    @classmethod
    def create_task(cls, task_id: str, obligation_id: str, title: str, owner: str, department: str, dependencies: list):
        query = """
        MERGE (t:Task {task_id: $task_id})
        ON CREATE SET t.title = $title, t.owner = $owner, t.department = $department
        WITH t
        MATCH (o:Obligation {obligation_id: $obligation_id})
        MERGE (o)-[:GENERATES]->(t)
        """
        Neo4jManager.execute_query(query, {
            "task_id": task_id, "obligation_id": obligation_id,
            "title": title, "owner": owner, "department": department
        })
        
        # Link dependencies (title-based linking for now)
        if dependencies:
            dep_query = """
            MATCH (t:Task {task_id: $task_id})
            UNWIND $dependencies AS dep_title
            MATCH (dep:Task {title: dep_title})
            MERGE (t)-[:DEPENDS_ON]->(dep)
            """
            Neo4jManager.execute_query(dep_query, {"task_id": task_id, "dependencies": dependencies})
