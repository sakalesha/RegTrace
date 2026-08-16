"""Tests for the Evidence Collection module (schema + agent pure logic).

These tests cover the deterministic, non-database logic of the Evidence
Collection Agent and its schemas: file validation, size limits, enum/status
handling, and schema round-tripping.
"""
import os
import pytest

from app.agents.evidence_collection_agent import EvidenceCollectionAgent
from app.schemas.evidence import EvidenceCreate, EvidenceUpdate, EvidenceStatus
from app.models.evidence import EvidenceModel


@pytest.fixture
def agent():
    return EvidenceCollectionAgent()


class TestFileValidation:
    def test_allows_supported_extension(self, agent):
        agent._validate_file("audit_report.pdf", b"x" * 100)

    def test_allows_uppercase_extension(self, agent):
        agent._validate_file("report.PDF", b"x" * 100)

    def test_rejects_unsupported_extension(self, agent):
        with pytest.raises(ValueError, match="Unsupported file type"):
            agent._validate_file("malware.exe", b"x" * 100)

    def test_rejects_oversized_file(self, agent):
        with pytest.raises(ValueError, match="size limit"):
            agent._validate_file("big.pdf", b"x" * (26 * 1024 * 1024))

    def test_rejects_missing_name(self, agent):
        with pytest.raises(ValueError, match="file name is required"):
            agent._validate_file("", b"x" * 100)


class TestStoreFile:
    def test_requires_cloudinary_configured(self, monkeypatch):
        from app.config import config as app_config
        monkeypatch.setattr(app_config, "CLOUDINARY_CLOUD_NAME", "")
        with pytest.raises(ValueError, match="Cloudinary storage is required"):
            EvidenceCollectionAgent.store_file("report.pdf", b"x")

    def test_returns_cloud_url(self, monkeypatch):
        from app.config import config as app_config
        monkeypatch.setattr(app_config, "CLOUDINARY_CLOUD_NAME", "dc490ytyl")
        monkeypatch.setattr(
            "app.agents.evidence_collection_agent.StorageUtility.upload_file",
            lambda file_path, public_id=None: "https://res.cloudinary.com/raw/upload/x.pdf",
        )
        url = EvidenceCollectionAgent.store_file("report.pdf", b"x")
        assert url == "https://res.cloudinary.com/raw/upload/x.pdf"

    def test_raises_when_upload_returns_no_url(self, monkeypatch):
        from app.config import config as app_config
        monkeypatch.setattr(app_config, "CLOUDINARY_CLOUD_NAME", "dc490ytyl")
        monkeypatch.setattr(
            "app.agents.evidence_collection_agent.StorageUtility.upload_file",
            lambda file_path, public_id=None: "not-a-url",
        )
        with pytest.raises(ValueError, match="no URL was returned"):
            EvidenceCollectionAgent.store_file("report.pdf", b"x")

    def test_raises_on_upload_error(self, monkeypatch):
        from app.config import config as app_config
        monkeypatch.setattr(app_config, "CLOUDINARY_CLOUD_NAME", "dc490ytyl")
        monkeypatch.setattr(
            "app.agents.evidence_collection_agent.StorageUtility.upload_file",
            lambda file_path, public_id=None: (_ for _ in ()).throw(RuntimeError("boom")),
        )
        with pytest.raises(RuntimeError):
            EvidenceCollectionAgent.store_file("report.pdf", b"x")


class TestEvidenceModel:
    def test_default_status_is_submitted(self):
        record = EvidenceModel(
            _id="abc", task_id="t", document_id="d", obligation_id="o",
            file_name="f.pdf", file_url="http://x",
        )
        assert record.status == EvidenceStatus.SUBMITTED

    def test_dump_includes_alias_and_status_value(self):
        record = EvidenceModel(
            _id="abc", task_id="t", document_id="d", obligation_id="o",
            file_name="f.pdf", file_url="http://x",
        )
        dumped = record.model_dump(by_alias=True)
        assert dumped["_id"] == "abc"
        assert dumped["status"] == EvidenceStatus.SUBMITTED.value


class TestEvidenceSchemas:
    def test_create_accepts_valid_fields(self):
        create = EvidenceCreate(
            task_id="t", document_id="d", obligation_id="o",
            file_name="f.pdf", file_url="http://x", description="proof",
        )
        assert create.description == "proof"

    def test_update_excludes_unset(self):
        update = EvidenceUpdate(status=EvidenceStatus.ACCEPTED)
        dumped = update.model_dump(exclude_unset=True, mode="json")
        assert dumped == {"status": "ACCEPTED"}

    def test_evidence_statuses(self):
        assert {s.value for s in EvidenceStatus} == {"SUBMITTED", "ACCEPTED", "REJECTED"}
