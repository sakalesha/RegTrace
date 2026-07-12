import pytest
from shared.schemas.gap import GapRecord

def test_gap_creation():
    gap = GapRecord(
        document_id="DOC-1",
        severity="HIGH",
        title="Gap in Task",
        description="Missing",
        affected_task="TSK-1",
        affected_obligation="OBL-1",
        risk="HIGH",
        recommendation="Fix it",
        estimated_effort="Low",
        priority="P1"
    )
    assert gap.risk == "HIGH"
