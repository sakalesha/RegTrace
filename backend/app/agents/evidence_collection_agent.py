import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Optional

from app.agents.base_agent import BaseAgent
from app.schemas.evidence import EvidenceCreate, EvidenceStatus
from app.utils.storage import StorageUtility

_logger = logging.getLogger("pipeline.evidence")

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt", ".log", ".eml"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


class EvidenceCollectionAgent(BaseAgent):
    """
    Deterministic agent that validates, stores, links, and persists a submitted
    compliance evidence file. No language model is involved: evidence capture is
    a reliable, auditable storage operation.
    """

    def __init__(self):
        self.storage = StorageUtility()

    def _validate_file(self, file_name: str, content: bytes) -> None:
        if not file_name:
            raise ValueError("Evidence file name is required")
        ext = Path(file_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported file type '{ext or 'unknown'}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
        if len(content) > MAX_FILE_SIZE:
            raise ValueError(f"Evidence file exceeds the {MAX_FILE_SIZE // (1024 * 1024)} MB size limit")

    async def validate(self, input_data: EvidenceCreate):
        if not isinstance(input_data, EvidenceCreate):
            raise ValueError("Input data must be an EvidenceCreate.")
        if not input_data.task_id:
            raise ValueError("Evidence requires a task_id.")
        if not input_data.document_id:
            raise ValueError("Evidence requires a document_id.")
        if not input_data.file_url:
            raise ValueError("Evidence requires a stored file_url.")

    async def process(self, input_data: EvidenceCreate) -> EvidenceCreate:
        # Validation and storage happen before persistence in the service layer.
        # Here we simply carry the validated record through the pipeline.
        return input_data

    async def validate_output(self, output_data: Any):
        if not isinstance(output_data, EvidenceCreate):
            raise ValueError("Output must be of type EvidenceCreate")

    async def persist(self, output_data: Any):
        # Persistence is handled by the EvidenceService which maps and saves the DB model.
        pass

    @staticmethod
    def store_file(file_name: str, content: bytes, public_id: Optional[str] = None) -> str:
        """
        Upload an evidence file to Cloudinary and return its secure URL.

        Evidence is stored only in Cloudinary; the local disk is used solely as a
        transient upload buffer and is deleted afterwards. Retrieval is handled by
        the /file endpoint, which proxies the stored URL back to the client.
        Cloudinary must be configured or submission fails loudly.
        """
        from app.config import config

        if not config.CLOUDINARY_CLOUD_NAME:
            raise ValueError("Cloudinary storage is required but CLOUDINARY_CLOUD_NAME is not configured.")

        suffix = Path(file_name).suffix
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        try:
            tmp.write(content)
            tmp.flush()
            url = StorageUtility.upload_file(tmp_path, public_id=public_id)
        finally:
            tmp.close()
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        if not url or not url.startswith("http"):
            raise ValueError("Failed to store evidence in Cloudinary; no URL was returned.")
        return url
