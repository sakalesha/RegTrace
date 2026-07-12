import React, { useState } from "react";
import {
  Upload, ListChecks, CheckCircle2, Link2, LayoutDashboard, Gavel
} from "lucide-react";

import IngestTab from "./components/IngestTab";
import ReviewTab from "./components/ReviewTab";
import TasksTab from "./components/TasksTab";
import TraceTab from "./components/TraceTab";
import DashboardTab from "./components/DashboardTab";

const TABS = [
  { id: "ingest", label: "Ingest", icon: Upload },
  { id: "review", label: "Review Queue", icon: ListChecks },
  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "trace", label: "Trace", icon: Link2 },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function App() {
  const [tab, setTab] = useState("ingest");
  const [documentId, setDocumentId] = useState(null);

  const handlePipelineComplete = (result) => {
    if (result?.document_id) {
      setDocumentId(result.document_id);
    }
    setTab("review");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header className="rt-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Gavel size={22} color="var(--gold)" />
          <div>
            <div className="rt-header-title">RegTrace</div>
            <div className="rt-sans rt-header-subtitle">REGULATORY TEXT → OPERATIONAL ACTION · SEBI TechSprint 2026</div>
          </div>
        </div>
        <div className="rt-sans" style={{ fontSize: 11, opacity: 0.7, textAlign: "right" }}>
          {documentId && <div>Document: {documentId}</div>}
          <div>AI-Powered Compliance Engine</div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="rt-tabs rt-sans">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rt-tab ${tab === t.id ? "active" : ""}`}
            >
              <Icon size={15} />{t.label}
            </div>
          );
        })}
      </nav>

      {/* Content */}
      <main className="rt-content" style={{ flex: 1 }}>
        {tab === "ingest" && <IngestTab onPipelineComplete={handlePipelineComplete} />}
        {tab === "review" && <ReviewTab documentId={documentId} />}
        {tab === "tasks" && <TasksTab documentId={documentId} />}
        {tab === "trace" && <TraceTab documentId={documentId} />}
        {tab === "dashboard" && <DashboardTab documentId={documentId} />}
      </main>

      {/* Footer */}
      <footer className="rt-sans rt-footer">
        RegTrace — SEBI TechSprint 2026 · Agentic Compliance Intelligence Platform
      </footer>
    </div>
  );
}
