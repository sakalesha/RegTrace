import uuid
import traceback
from datetime import datetime
from fastapi import UploadFile

from shared.database.mongodb import get_db
from shared.schemas.document import DocumentMetadataInput
from shared.schemas.pipeline import ExecutionContext, AgentResult, PipelineConfig
from shared.services.logger import Logger

from agents.ingestion import IngestionAgent
from agents.clause_segmentation import ClauseSegmentationAgent
from agents.obligation import ObligationExtractionAgent
# from agents.chunking import ChunkingAgent
# from agents.embedding import EmbeddingAgent
# from agents.validation import ValidationAgent
# from agents.graph import KnowledgeGraphAgent
# from agents.task_generation import TaskGenerationAgent
# from agents.task_assignment import TaskAssignmentAgent
# from agents.evidence import EvidenceCollectionAgent
# from agents.evaluation import ComplianceEvaluationAgent
# from agents.gap import GapAnalysisAgent
# from agents.report import AuditReportAgent


class OrchestratorAgent:
    
    @classmethod
    async def run(cls, context: ExecutionContext) -> ExecutionContext:
        db = get_db()
        Logger.info("Orchestrator", f"Starting workflow {context.execution_id}")
        
        context.started_at = datetime.utcnow()
        context.pipeline_status = "RUNNING"
        
        # Save initial pipeline state (excluding raw UploadFile from DB)
        db_payload = context.model_dump(exclude={"metadata"})
        await db.pipeline_execution.insert_one(db_payload)
        
        agents = [
            ("IngestionAgent", IngestionAgent),
            ("ClauseSegmentationAgent", ClauseSegmentationAgent),
            ("ObligationExtractionAgent", ObligationExtractionAgent),
            # ("ChunkingAgent", ChunkingAgent),
            # ("EmbeddingAgent", EmbeddingAgent),
            # ("ValidationAgent", ValidationAgent),
            # ("TaskGenerationAgent", TaskGenerationAgent),
            # ("TaskAssignmentAgent", TaskAssignmentAgent)
        ]
        
        # if context.config.enable_knowledge_graph:
        #     agents.append(("KnowledgeGraphAgent", KnowledgeGraphAgent))
        
        # if context.config.enable_mock_evidence:
        #     agents.append(("EvidenceCollectionAgent", EvidenceCollectionAgent))
        #     agents.append(("ComplianceEvaluationAgent", ComplianceEvaluationAgent))
            
        # if context.config.enable_gap_analysis:
        #     agents.append(("GapAnalysisAgent", GapAnalysisAgent))
            
        # if context.config.enable_audit_report:
        #     agents.append(("AuditReportAgent", AuditReportAgent))

        for agent_name, agent_cls in agents:
            context.current_agent = agent_name
            await db.pipeline_execution.update_one(
                {"execution_id": context.execution_id},
                {"$set": {"current_agent": agent_name}}
            )
            
            agent_start = datetime.utcnow()
            agent_status = "SUCCESS"
            agent_error = None
            
            try:
                Logger.info("Orchestrator", f"Running {agent_name}...")
                context = await agent_cls.execute(context)
                
                # Explicit validation checks
                if agent_name == "IngestionAgent" and not context.metadata.get("raw_text"):
                    raise ValueError("IngestionAgent failed to produce raw_text.")
                elif agent_name == "ClauseSegmentationAgent" and not context.metadata.get("clause_ids"):
                    raise ValueError("ClauseSegmentationAgent failed to produce clause_ids.")
                elif agent_name == "ObligationExtractionAgent" and not context.metadata.get("extraction_run_id"):
                    raise ValueError("ObligationExtractionAgent failed to produce extraction_run_id.")
                    
            except Exception as e:
                Logger.error("Orchestrator", f"{agent_name} failed", exc=e)
                agent_status = "FAILED"
                agent_error = f"{str(e)}\n{traceback.format_exc()}"
                context.pipeline_status = "FAILED"
                
            agent_end = datetime.utcnow()
            agent_duration = (agent_end - agent_start).total_seconds()
            
            result = AgentResult(
                agent_name=agent_name,
                started_at=agent_start,
                finished_at=agent_end,
                duration_seconds=agent_duration,
                status=agent_status,
                error=agent_error
            )
            context.results.append(result)
            
            # Sync context to DB
            await db.pipeline_execution.update_one(
                {"execution_id": context.execution_id},
                {"$set": {
                    "document_id": context.document_id,
                    "pipeline_status": context.pipeline_status,
                    "results": [r.model_dump() for r in context.results]
                }}
            )
            
            if context.pipeline_status == "FAILED":
                break

        if context.pipeline_status != "FAILED":
            context.pipeline_status = "SUCCESS"
            
        context.completed_at = datetime.utcnow()
        context.overall_duration = (context.completed_at - context.started_at).total_seconds()
        
        await db.pipeline_execution.update_one(
            {"execution_id": context.execution_id},
            {"$set": {
                "pipeline_status": context.pipeline_status,
                "completed_at": context.completed_at,
                "overall_duration": context.overall_duration,
                "current_agent": None
            }}
        )
        
        Logger.info("Orchestrator", f"Workflow {context.execution_id} finished in {context.overall_duration:.2f}s with status {context.pipeline_status}")
        return context

class PipelineController:

    @classmethod
    async def start_pipeline(cls, file: UploadFile, metadata_input: DocumentMetadataInput):
        execution_id = f"WF-{uuid.uuid4().hex[:8].upper()}"
        
        context = ExecutionContext(
            execution_id=execution_id,
            metadata={
                "upload_file": file,
                "metadata_input": metadata_input
            }
        )
        
        context = await OrchestratorAgent.run(context)
        
        return {
            "execution_id": context.execution_id,
            "document_id": context.document_id,
            "status": context.pipeline_status,
            "overall_duration": context.overall_duration,
            "report_id": context.report_id,
            "report_url": context.report_url,
            "agents_executed": len(context.results)
        }
