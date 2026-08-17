"""Pure-logic tests for the Search Service and Embedding Module.

Covers the deterministic, non-database logic: cosine similarity, snippet
generation, and search schema round-tripping. Model-dependent embedding
generation is intentionally not exercised here (heavy / network-free tests).
"""
import pytest

from app.services.embedding_service import cosine
from app.services.search_service import _make_snippet
from app.schemas.search import SearchResultItem, SearchResponse, SearchType, SearchMode


class TestCosine:
    def test_identical_vectors(self):
        assert cosine([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)

    def test_orthogonal_vectors(self):
        assert cosine([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)

    def test_opposite_vectors(self):
        assert cosine([1.0, 1.0], [-1.0, -1.0]) == pytest.approx(-1.0)

    def test_zero_vector_is_safe(self):
        assert cosine([0.0, 0.0], [1.0, 0.0]) == 0.0

    def test_mismatched_lengths_are_safe(self):
        assert cosine([1.0, 2.0, 3.0], [1.0, 2.0]) == 0.0


class TestMakeSnippet:
    def test_empty_text(self):
        assert _make_snippet("", "report") == ""

    def test_token_match_centers_window(self):
        text = "The bank must report suspicious activity monthly to the regulator."
        snippet = _make_snippet(text, "report")
        assert "report" in snippet
        assert len(snippet) <= 160

    def test_missing_token_returns_prefix(self):
        text = "Completely unrelated sentence about weather and birds."
        snippet = _make_snippet(text, "report")
        assert snippet == text[:160]

    def test_long_match_truncates_around_match(self):
        text = "x" * 50 + " keyword " + "y" * 300
        snippet = _make_snippet(text, "keyword")
        assert "keyword" in snippet
        assert len(snippet) <= 160


class TestSearchSchemas:
    def test_result_item_round_trip(self):
        item = SearchResultItem(
            type="CLAUSE",
            id="c1",
            document_id="d1",
            title="Clause 1",
            snippet="some text",
            meta={"chapter": "3"},
            score=0.91,
            link="/documents/d1/clauses",
        )
        dumped = item.model_dump()
        assert dumped["type"] == "CLAUSE"
        assert dumped["meta"]["chapter"] == "3"
        assert dumped["score"] == 0.91

    def test_response_defaults(self):
        resp = SearchResponse(query="q", mode=SearchMode.ALL.value, total=0, results=[])
        assert resp.total == 0
        assert resp.results == []

    def test_search_type_values(self):
        assert {t.value for t in SearchType} == {"ALL", "CLAUSE", "OBLIGATION", "DOCUMENT"}
