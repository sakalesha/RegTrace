from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.database.mongodb import MongoDBManager
from shared.database.qdrant import QdrantManager
from shared.database.neo4j_manager import Neo4jManager
from backend.app.api.endpoints.ingestion import router as ingestion_router
from backend.app.api.endpoints.pipeline import router as pipeline_router
from backend.app.api.endpoints.obligations import router as obligations_router
from backend.app.api.endpoints.tasks import router as tasks_router
from backend.app.api.endpoints.dashboard import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup events
    MongoDBManager.connect()
    # QdrantManager.connect()
    # Neo4jManager.connect()
    yield
    # Shutdown events
    MongoDBManager.disconnect()
    # Neo4jManager.disconnect()

app = FastAPI(
    title="Agentic Compliance API",
    description="API for translating regulatory text to operational action",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - Allow all origins for the TechSprint prototype to avoid deployment issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion_router, prefix="/api/v1", tags=["Ingestion"])
app.include_router(pipeline_router, prefix="/api/v1", tags=["Pipeline"])
app.include_router(obligations_router, prefix="/api/v1", tags=["Obligations"])
app.include_router(tasks_router, prefix="/api/v1", tags=["Tasks"])
app.include_router(dashboard_router, prefix="/api/v1", tags=["Dashboard"])

from backend.app.api.endpoints.monitoring import router as monitoring_router
from backend.app.auth.router import router as auth_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(monitoring_router, prefix="/api/v1", tags=["Monitoring"])

@app.get("/health", tags=["System"])
async def health_check():
    """
    Basic health check endpoint to verify the service is running.
    """
    return {"status": "ok", "message": "Agentic Compliance API is running"}
