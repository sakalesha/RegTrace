import logging
import re
from typing import List, Optional

from app.db.mongodb import db
from app.schemas.search import (
    SearchType,
    SearchMode,
    SearchResultItem,
    SearchResponse,
)

logger = logging.getLogger("search")

_INDEXES_READY = False


def _make_snippet(text: str, query: str, window: int = 160) -> str:
    if not text:
        return ""
    tokens = [t for t in re.split(r"\s+", query.strip()) if t]
    lower = text.lower()
    idx = -1
    for t in tokens:
        p = lower.find(t.lower())
        if p != -1 and (idx == -1 or p < idx):
            idx = p
    if idx == -1:
        return text[:window]
    start = max(0, idx - window // 3)
    end = min(len(text), start + window)
    return text[start:end].strip()


async def ensure_indexes() -> None:
    """Create the $text indexes used by keyword search (idempotent)."""
    global _INDEXES_READY
    if _INDEXES_READY:
        return
    database = db.get_db()
    specs = [
        ("clauses", [("title", "text"), ("heading", "text"), ("chapter", "text"), ("text", "text"), ("references", "text")], "text_clauses"),
        ("obligations", [("action", "text"), ("actor", "text"), ("condition", "text"), ("deadline", "text"), ("frequency", "text")], "text_obligations"),
        ("documents", [("title", "text"), ("document_type", "text"), ("source", "text"), ("metadata.title", "text")], "text_documents"),
    ]
    for coll, fields, name in specs:
        try:
            existing = await database[coll].index_information()
            if name in existing:
                continue
            await database[coll].create_index(fields, name=name, background=True)
        except Exception as e:  # pragma: no cover - index quirks
            logger.warning("Could not create text index %s: %s", name, e)
    _INDEXES_READY = True


class SearchService:
    async def search(
        self,
        q: str,
        mode: str = SearchMode.ALL.value,
        type_: str = SearchType.ALL.value,
        document_id: Optional[str] = None,
        limit: int = 30,
    ) -> SearchResponse:
        q = (q or "").strip()
        if not q:
            return SearchResponse(query=q, mode=mode, total=0, results=[])

        await ensure_indexes()
        results: List[SearchResultItem] = []

        want_keyword = mode in (SearchMode.KEYWORD.value, SearchMode.ALL.value)
        want_semantic = mode in (SearchMode.SEMANTIC.value, SearchMode.ALL.value)

        if want_keyword:
            results.extend(await self._keyword(q, type_, document_id, limit))
        if want_semantic:
            results.extend(await self._semantic(q, type_, document_id, limit))

        # De-dupe by (type, id) keeping the higher score, then sort + cap.
        best = {}
        for r in results:
            key = (r.type, r.id)
            if key not in best or r.score > best[key].score:
                best[key] = r
        merged = sorted(best.values(), key=lambda x: x.score, reverse=True)[:limit]
        return SearchResponse(query=q, mode=mode, total=len(merged), results=merged)

    async def _keyword(self, q, type_, document_id, limit) -> List[SearchResultItem]:
        database = db.get_db()
        out: List[SearchResultItem] = []
        base = {"$text": {"$search": q}}
        if document_id:
            base["document_id"] = document_id

        if type_ in (SearchType.ALL.value, SearchType.CLAUSE.value):
            cursor = database.clauses.find(
                base, {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            async for d in cursor:
                out.append(SearchResultItem(
                    type="CLAUSE",
                    id=d.get("clause_id"),
                    document_id=d.get("document_id", ""),
                    title=d.get("heading") or d.get("title") or f"Clause {d.get('clause_id')}",
                    snippet=_make_snippet(d.get("text", ""), q),
                    meta={"chapter": d.get("chapter"), "section": d.get("section_number")},
                    score=round(float(d.get("score", 0)), 4),
                    link=f"/documents/{d.get('document_id')}/clauses",
                ))

        if type_ in (SearchType.ALL.value, SearchType.OBLIGATION.value):
            cursor = database.obligations.find(
                base, {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            async for d in cursor:
                out.append(SearchResultItem(
                    type="OBLIGATION",
                    id=str(d.get("_id")),
                    document_id=d.get("document_id", ""),
                    title=d.get("action", "Obligation"),
                    snippet=_make_snippet((d.get("condition") or ""), q),
                    meta={"actor": d.get("actor"), "status": d.get("status")},
                    score=round(float(d.get("score", 0)), 4),
                    link="/obligations",
                ))

        if type_ in (SearchType.ALL.value, SearchType.DOCUMENT.value):
            cursor = database.documents.find(
                base, {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit)
            async for d in cursor:
                title = d.get("title") or d.get("metadata", {}).get("title") or d.get("document_id")
                out.append(SearchResultItem(
                    type="DOCUMENT",
                    id=d.get("document_id"),
                    document_id=d.get("document_id", ""),
                    title=title,
                    snippet=_make_snippet(title or "", q),
                    meta={"document_type": d.get("document_type"), "source": d.get("source")},
                    score=round(float(d.get("score", 0)), 4),
                    link=f"/documents/{d.get('document_id')}",
                ))
        return out

    async def _semantic(self, q, type_, document_id, limit) -> List[SearchResultItem]:
        from app.services.embedding_service import embed_one, cosine

        vec = embed_one(q)
        if not vec:
            return []
        database = db.get_db()
        out: List[SearchResultItem] = []

        if type_ in (SearchType.ALL.value, SearchType.CLAUSE.value):
            filt = {"embedding": {"$exists": True}}
            if document_id:
                filt["document_id"] = document_id
            cursor = database.clauses.find(filt, {"clause_id": 1, "document_id": 1, "text": 1, "heading": 1, "title": 1, "chapter": 1, "section_number": 1, "embedding": 1})
            async for d in cursor:
                sim = cosine(vec, d.get("embedding") or [])
                if sim <= 0:
                    continue
                out.append(SearchResultItem(
                    type="CLAUSE",
                    id=d.get("clause_id"),
                    document_id=d.get("document_id", ""),
                    title=d.get("heading") or d.get("title") or f"Clause {d.get('clause_id')}",
                    snippet=_make_snippet(d.get("text", ""), q),
                    meta={"chapter": d.get("chapter"), "section": d.get("section_number")},
                    score=round(sim, 4),
                    link=f"/documents/{d.get('document_id')}/clauses",
                ))

        if type_ in (SearchType.ALL.value, SearchType.OBLIGATION.value):
            filt = {"embedding": {"$exists": True}}
            if document_id:
                filt["document_id"] = document_id
            cursor = database.obligations.find(filt, {"_id": 1, "document_id": 1, "action": 1, "condition": 1, "actor": 1, "status": 1, "embedding": 1})
            async for d in cursor:
                sim = cosine(vec, d.get("embedding") or [])
                if sim <= 0:
                    continue
                out.append(SearchResultItem(
                    type="OBLIGATION",
                    id=str(d.get("_id")),
                    document_id=d.get("document_id", ""),
                    title=d.get("action", "Obligation"),
                    snippet=_make_snippet(d.get("condition") or "", q),
                    meta={"actor": d.get("actor"), "status": d.get("status")},
                    score=round(sim, 4),
                    link="/obligations",
                ))
        return out
