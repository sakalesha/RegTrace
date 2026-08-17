from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SearchType(str, Enum):
    ALL = "ALL"
    CLAUSE = "CLAUSE"
    OBLIGATION = "OBLIGATION"
    DOCUMENT = "DOCUMENT"


class SearchMode(str, Enum):
    KEYWORD = "KEYWORD"
    SEMANTIC = "SEMANTIC"
    ALL = "ALL"


class SearchResultItem(BaseModel):
    type: str
    id: str
    document_id: str
    title: str
    snippet: str
    meta: dict = Field(default_factory=dict)
    score: float
    link: str


class SearchResponse(BaseModel):
    query: str
    mode: str
    total: int
    results: List[SearchResultItem]
