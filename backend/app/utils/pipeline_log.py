"""Consistent progress logging helpers for the RegTrace pipeline.

Each pipeline stage logs through a module logger created by ``get_stage_logger``.
The helpers print stage banners and per-batch progress lines so the terminal
shows a clear, timestamped timeline of what is happening and where.
"""
import logging
import time
from typing import Optional


def get_stage_logger(stage: str) -> logging.Logger:
    """Return a logger named ``pipeline.<stage>`` for clean terminal grouping."""
    return logging.getLogger(f"pipeline.{stage}")


def stage_start(logger: logging.Logger, stage: str, document_id: str, detail: str = "") -> float:
    """Log a stage-start banner and return the wall-clock start time."""
    suffix = f" | {detail}" if detail else ""
    logger.info("=== %s START  doc=%s%s", stage.upper(), document_id, suffix)
    return time.monotonic()


def stage_done(logger: logging.Logger, stage: str, document_id: str, detail: str = "", start: Optional[float] = None) -> None:
    """Log a stage-complete banner, optionally with elapsed seconds."""
    elapsed = ""
    if start is not None:
        elapsed = f" ({time.monotonic() - start:.1f}s)"
    suffix = f" | {detail}" if detail else ""
    logger.info("=== %s DONE   doc=%s%s%s", stage.upper(), document_id, suffix, elapsed)


def stage_fail(logger: logging.Logger, stage: str, document_id: str, error: Exception) -> None:
    """Log a stage failure with the exception and its type."""
    logger.error("!!! %s FAILED  doc=%s | %s: %s",
                 stage.upper(), document_id, type(error).__name__, error)