import pytest
import uuid
from repositories.graph_repository import GraphRepository
from shared.database.neo4j_manager import Neo4jManager

def test_duplicate_prevention():
    doc_id = f"TEST-DOC-{uuid.uuid4().hex[:4]}"
    
    # Run twice to test MERGE
    GraphRepository.create_document(doc_id, "Test Title")
    GraphRepository.create_document(doc_id, "Test Title")
    
    result = Neo4jManager.execute_query(
        "MATCH (d:Document {document_id: $doc_id}) RETURN count(d) as count",
        {"doc_id": doc_id}
    )
    assert result[0]["count"] == 1

def test_graph_relationships():
    doc_id = f"TEST-DOC-{uuid.uuid4().hex[:4]}"
    chunk_id = f"CHK-{uuid.uuid4().hex[:4]}"
    ob_id = f"OBL-{uuid.uuid4().hex[:4]}"
    task_id1 = f"TSK-{uuid.uuid4().hex[:4]}"
    task_id2 = f"TSK-{uuid.uuid4().hex[:4]}"
    
    GraphRepository.create_document(doc_id, "Rel Doc")
    GraphRepository.create_chunk(chunk_id, doc_id, 1, "H1", "S1")
    GraphRepository.create_obligation(ob_id, chunk_id, "Ob Title", "Broker", "Maintain")
    GraphRepository.create_task(task_id1, ob_id, "Main Task", "IT", "Security", [])
    GraphRepository.create_task(task_id2, ob_id, "Sub Task", "IT", "Security", ["Main Task"])
    
    # Test dependencies
    res = Neo4jManager.execute_query(
        "MATCH (t1:Task {task_id: $t2})-[:DEPENDS_ON]->(t2:Task {title: 'Main Task'}) RETURN t1",
        {"t2": task_id2}
    )
    assert len(res) == 1
