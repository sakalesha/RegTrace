import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import documents, clauses, obligations, dashboard, tasks, pipeline, evidence, compliance, gap, reports, search, embeddings

# ---------------------------------------------------------------------------
# Centralised logging for the pipeline. Every stage (upload, parse, segment,
# extract, tasks) logs progress through its module logger, so the terminal
# shows a clear, timestamped timeline of what is happening.
# ---------------------------------------------------------------------------
def configure_logging() -> None:
    fmt = "%(asctime)s | %(levelname)-7s | %(name)-28s | %(message)s"
    logging.basicConfig(level=logging.INFO, format=fmt, datefmt="%H:%M:%S")

    # Tune noisy third-party loggers.
    logging.getLogger("httpx").setLevel(logging.WARNING)      # Groq HTTP chatter
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

configure_logging()

app = FastAPI(
    title="RegTrace API",
    description="Backend API for RegTrace",
    version="1.0.0"
)

# Configure CORS. Set CORS_ORIGINS on Render to your Vercel frontend URL
# (comma-separated) to restrict access; defaults to "*" for local/dev.
import os

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(clauses.router, prefix="/api/clauses", tags=["clauses"])
app.include_router(obligations.router, prefix="/api/obligations", tags=["obligations"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])
app.include_router(evidence.router, prefix="/api/evidence", tags=["evidence"])
app.include_router(compliance.router, prefix="/api/compliance", tags=["compliance"])
app.include_router(gap.router, prefix="/api/gap", tags=["gap"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(embeddings.router, prefix="/api/embeddings", tags=["embeddings"])

@app.get("/")
async def root():
    return {"message": "Welcome to RegTrace API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
