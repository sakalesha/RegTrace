# RegTrace Repository Structure
```mermaid
regtrace/
│
├── README.md
├── LICENSE
├── .gitignore
├── docker-compose.yml
├── .env.example
│
├── context/                         # AI and engineering context documents
│   ├── Module-Wise_Design
│   │   ├── 1-Ingestion-Agent.md
│   │   ├── 2-Parsing-Agent.md
│   │   ├── 3-Clause-Segmentation-Agent.md
│   │   ├── 4-Obligation-Extraction-Agent.md
│   │   ├── 5-Task-Generation-Agent.md
│   │   ├── 6-Compliance-Evaluation-Agent.md
│   │   ├── 7-Gap-Analysis-Agent.md
│   │   └── 8-Audit-Report-Agent.md
│   ├── README.md
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── MODULES.md
│   ├── CODE_STANDARDS.md
│   ├── AI_WORKFLOW_RULES.md
│   ├── AGENTS.md
│   └── Problem-solving-steps.md
│
├── backend/
│   ├── README.md
│   ├── requirements.txt
│   ├── pyproject.toml
│   │
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── documents.py
│   │   │   │   ├── obligations.py
│   │   │   │   ├── tasks.py
│   │   │   │   ├── evidence.py
│   │   │   │   ├── reports.py
│   │   │   │   ├── dashboard.py
│   │   │   │   └── search.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── services/
│   │   │   ├── document_service.py
│   │   │   ├── parsing_service.py
│   │   │   ├── clause_service.py
│   │   │   ├── obligation_service.py
│   │   │   ├── review_service.py
│   │   │   ├── task_service.py
│   │   │   ├── evidence_service.py
│   │   │   ├── compliance_service.py
│   │   │   ├── gap_service.py
│   │   │   ├── report_service.py
│   │   │   └── search_service.py
│   │   │
│   │   ├── agents/
│   │   │   ├── base_agent.py
│   │   │   ├── ingestion_agent.py
│   │   │   ├── parsing_agent.py
│   │   │   ├── chunking_agent.py
│   │   │   ├── embedding_agent.py
│   │   │   ├── clause_segmentation_agent.py
│   │   │   ├── obligation_extraction_agent.py
│   │   │   ├── human_review_agent.py
│   │   │   ├── task_generation_agent.py
│   │   │   ├── task_assignment_agent.py
│   │   │   ├── evidence_collection_agent.py
│   │   │   ├── compliance_evaluation_agent.py
│   │   │   ├── gap_analysis_agent.py
│   │   │   ├── audit_report_agent.py
│   │   │   └── orchestrator.py
│   │   │
│   │   ├── prompts/
│   │   │   ├── obligation_extraction.md
│   │   │   ├── task_generation.md
│   │   │   ├── compliance_evaluation.md
│   │   │   ├── gap_analysis.md
│   │   │   └── audit_report.md
│   │   │
│   │   ├── models/
│   │   │   ├── document.py
│   │   │   ├── clause.py
│   │   │   ├── obligation.py
│   │   │   ├── task.py
│   │   │   ├── evidence.py
│   │   │   ├── compliance.py
│   │   │   ├── gap.py
│   │   │   └── report.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── document.py
│   │   │   ├── clause.py
│   │   │   ├── obligation.py
│   │   │   ├── task.py
│   │   │   ├── evidence.py
│   │   │   ├── compliance.py
│   │   │   ├── gap.py
│   │   │   └── report.py
│   │   │
│   │   ├── db/
│   │   │   ├── mongodb.py
│   │   │   ├── repositories/
│   │   │   │   ├── document_repository.py
│   │   │   │   ├── obligation_repository.py
│   │   │   │   ├── task_repository.py
│   │   │   │   └── report_repository.py
│   │   │   └── migrations/
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.py
│   │   │   ├── storage.py
│   │   │   ├── pdf.py
│   │   │   ├── ocr.py
│   │   │   ├── validators.py
│   │   │   └── constants.py
│   │   │
│   │   └── config.py
│   │
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── e2e/
│
├── frontend/
│   ├── README.md
│   ├── package.json
│   ├── vite.config.js
│   │
│   ├── public/
│   │
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       │
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Documents.jsx
│       │   ├── Obligations.jsx
│       │   ├── Tasks.jsx
│       │   ├── Evidence.jsx
│       │   ├── Reports.jsx
│       │   └── Search.jsx
│       │
│       ├── components/
│       │   ├── layout/
│       │   ├── dashboard/
│       │   ├── documents/
│       │   ├── obligations/
│       │   ├── tasks/
│       │   ├── evidence/
│       │   ├── reports/
│       │   └── common/
│       │
│       ├── features/
│       │   ├── dashboard/
│       │   ├── documents/
│       │   ├── obligations/
│       │   ├── tasks/
│       │   ├── evidence/
│       │   └── reports/
│       │
│       ├── services/
│       │   ├── api.js
│       │   ├── documentService.js
│       │   ├── obligationService.js
│       │   ├── taskService.js
│       │   ├── evidenceService.js
│       │   └── reportService.js
│       │
│       ├── hooks/
│       │   ├── useDocuments.js
│       │   ├── useTasks.js
│       │   └── useDashboard.js
│       │
│       ├── utils/
│       └── styles/
│
├── data/
│   ├── regulatory_corpus/
│   │   └── sebi_master_circular_stockbrokers.pdf
│   │
│   ├── uploads/
│   ├── evidence/
│   ├── reports/
│   └── samples/
│
├── scripts/
│   ├── setup.sh
│   ├── seed_db.py
│   ├── reindex_embeddings.py
│   └── export_reports.py
│
├── infra/
│   ├── docker/
│   ├── nginx/
│   ├── deployment/
│   └── monitoring/
│
└── docs/
├── api/
├── diagrams/
├── screenshots/
└── demo/
```