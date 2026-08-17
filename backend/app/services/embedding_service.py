import logging
from typing import List, Optional

from app.db.mongodb import db

logger = logging.getLogger("embed")

# Local embedding model. Loaded lazily and cached so importing this module never
# pulls in torch/sentence-transformers (keeps builds and py_compile fast).
_MODEL = None
_MODEL_NAME = "all-MiniLM-L6-v2"
_EMBED_DIM = 384


def _load_model():
    """Lazily load the sentence-transformers model (cached process-wide)."""
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    try:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer(_MODEL_NAME)
        logger.info("Loaded embedding model %s", _MODEL_NAME)
    except Exception as e:  # pragma: no cover - depends on runtime deps
        logger.exception("Failed to load embedding model: %s", e)
        _MODEL = None
    return _MODEL


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Return 384-dim vectors for the given texts. Empty list -> empty result."""
    model = _load_model()
    if model is None or not texts:
        return []
    vectors = model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
    return [v.tolist() for v in vectors]


def embed_one(text: str) -> Optional[List[float]]:
    result = embed_texts([text])
    return result[0] if result else None


def cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    return float(dot)  # inputs are L2-normalised, so dot == cosine


async def embed_document(document_id: str) -> int:
    """
    Compute and persist embeddings for every clause + obligation of a document.
    Returns the number of records updated. Best-effort: skips silently if the
    model is unavailable.
    """
    database = db.get_db()
    updated = 0

    clauses = await database.clauses.find(
        {"document_id": document_id}, {"clause_id": 1, "text": 1}
    ).to_list(length=None)
    clause_texts = [(c["clause_id"], (c.get("text") or "").strip()) for c in clauses if (c.get("text") or "").strip()]
    if clause_texts:
        vectors = embed_texts([t for _, t in clause_texts])
        for (clause_id, _), vec in zip(clause_texts, vectors):
            await database.clauses.update_one(
                {"document_id": document_id, "clause_id": clause_id},
                {"$set": {"embedding": vec}}
            )
            updated += 1

    obligations = await database.obligations.find(
        {"document_id": document_id}, {"_id": 1, "action": 1, "condition": 1}
    ).to_list(length=None)
    ob_texts = [
        (o["_id"], " ".join(filter(None, [o.get("action") or "", o.get("condition") or ""])).strip())
        for o in obligations
    ]
    ob_texts = [(oid, t) for oid, t in ob_texts if t]
    if ob_texts:
        vectors = embed_texts([t for _, t in ob_texts])
        for (oid, _), vec in zip(ob_texts, vectors):
            await database.obligations.update_one(
                {"_id": oid},
                {"$set": {"embedding": vec}}
            )
            updated += 1

    logger.info("Embedded %d records for document %s", updated, document_id)
    return updated


async def embed_all_documents() -> int:
    """Backfill embeddings for every document in the database."""
    database = db.get_db()
    docs = await database.documents.find({}, {"document_id": 1}).to_list(length=None)
    total = 0
    for d in docs:
        total += await embed_document(d.get("document_id"))
    return total
