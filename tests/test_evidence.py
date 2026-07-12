import pytest
from shared.schemas.evidence import EvidenceRecord

def test_evidence_schema():
    ev = EvidenceRecord(
        evidence_id="EVD-123",
        task_id="TSK-1",
        obligation_id="OBL-1",
        source_type="MOCK",
        source_name="Mock",
        matched_text="Test",
        relevance_score=0.9
    )
    assert ev.status == "RETRIEVED"
    assert ev.relevance_score == 0.9
