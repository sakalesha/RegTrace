from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.database.mongodb import MongoDBManager
from backend.app.api.endpoints.ingestion import router as ingestion_router
from backend.app.api.endpoints.pipeline import router as pipeline_router
from backend.app.api.endpoints.obligations import router as obligations_router
from backend.app.api.endpoints.tasks import router as tasks_router
from backend.app.api.endpoints.dashboard import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup events
    MongoDBManager.connect()
    from shared.database.mongodb import get_db
    db = get_db()
    
    try:
        # Deduplicate existing rate_limits
        pipeline = [
            {"$group": {"_id": "$ip", "dups": {"$push": "$_id"}, "count": {"$sum": 1}}},
            {"$match": {"count": {"$gt": 1}}}
        ]
        cursor = db.rate_limits.aggregate(pipeline)
        async for doc in cursor:
            dups_to_remove = doc["dups"][1:]
            await db.rate_limits.delete_many({"_id": {"$in": dups_to_remove}})
            
        await db.rate_limits.create_index("ip", unique=True)

        # Deduplicate existing audit_log
        pipeline_audit = [
            {"$group": {"_id": "$seq", "dups": {"$push": "$_id"}, "count": {"$sum": 1}}},
            {"$match": {"count": {"$gt": 1}}}
        ]
        cursor_audit = db.audit_log.aggregate(pipeline_audit)
        async for doc in cursor_audit:
            dups_to_remove = doc["dups"][1:]
            await db.audit_log.delete_many({"_id": {"$in": dups_to_remove}})
            
        await db.audit_log.create_index([("seq", 1)], unique=True)
    except Exception as e:
        print(f"Error initializing indexes: {e}")
        raise
        
    scheduler = None
    try:
        # Init APScheduler
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        from agents.continuous_monitoring import ContinuousMonitoringAgent
        from shared.config.settings import settings
        
        try:
            scheduler = AsyncIOScheduler()
            scheduler.add_job(
                ContinuousMonitoringAgent.run_cycle,
                CronTrigger(hour=2, minute=0, timezone=settings.monitoring_job_timezone),
                id="daily_monitoring_job",
                replace_existing=True
            )
            scheduler.start()
        
            yield
        finally:
            if scheduler:
                scheduler.shutdown()
    finally:
        MongoDBManager.disconnect()
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
from backend.app.monitoring.router import router as compliance_gaps_router
from backend.app.auth.router import router as auth_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(monitoring_router, prefix="/api/v1", tags=["Monitoring"])
app.include_router(compliance_gaps_router, prefix="/api/v1", tags=["Compliance Gaps"])

@app.get("/health", tags=["System"])
async def health_check():
    """
    Basic health check endpoint to verify the service is running.
    """
    return {"status": "ok", "message": "Agentic Compliance API is running"}
