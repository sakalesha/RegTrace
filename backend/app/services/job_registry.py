import asyncio
from typing import Dict


class JobRegistry:
    """Tracks cancellation flags for in-flight pipeline jobs.

    Jobs register a document_id when they start and clear it when they
    finish. The cancel endpoint sets the flag; the long-running background
    tasks poll ``is_cancelled`` between iterations and abort cooperatively.
    """

    def __init__(self) -> None:
        self._cancel_events: Dict[str, asyncio.Event] = {}

    def register(self, document_id: str) -> asyncio.Event:
        event = self._cancel_events.get(document_id)
        if event is None:
            event = asyncio.Event()
            self._cancel_events[document_id] = event
        event.clear()
        return event

    def cancel(self, document_id: str) -> bool:
        """Request cancellation. Returns True if a job was registered."""
        event = self._cancel_events.get(document_id)
        if event is None:
            return False
        event.set()
        return True

    def is_cancelled(self, document_id: str) -> bool:
        event = self._cancel_events.get(document_id)
        return bool(event and event.is_set())

    def is_active(self, document_id: str) -> bool:
        """True if a job is currently registered (in-flight) for this document."""
        return document_id in self._cancel_events

    def clear(self, document_id: str) -> None:
        self._cancel_events.pop(document_id, None)


registry = JobRegistry()
