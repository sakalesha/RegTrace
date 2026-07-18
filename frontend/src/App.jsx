import React, { useState } from "react";
import {
  Upload, ListChecks, CheckCircle2, Link2, LayoutDashboard, Gavel, Shield
} from "lucide-react";

import { AuthProvider, useAuth } from './auth/AuthContext';
import RequireAuth from './components/RequireAuth';
import IngestTab from "./components/IngestTab";
import ReviewTab from "./components/ReviewTab";
import TasksTab from "./components/TasksTab";
import TraceTab from "./components/TraceTab";
import DashboardTab from "./components/DashboardTab";
import AdminTab from "./components/AdminTab";

const TABS = [
  { id: "ingest", label: "Ingest", icon: Upload },
  { id: "review", label: "Review Queue", icon: ListChecks },
  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "trace", label: "Trace", icon: Link2 },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "admin", label: "Admin Settings", icon: Shield },
];

function MainApp() {
  const [tab, setTab] = useState("ingest");
  const [documentId, setDocumentId] = useState(null);

  const handlePipelineComplete = (result) => {
    if (result?.document_id) {
      setDocumentId(result.document_id);
    }
    // Stay on the Ingest tab to allow the user to view the extracted text and clauses
    // setTab("review"); 
  };

  const { user, logout } = useAuth();
  
  // Filter tabs based on role
  const visibleTabs = TABS.filter(t => {
    if (t.id === "ingest" || t.id === "review") {
      return user?.role === "ADMIN" || user?.role === "COMPLIANCE_OFFICER";
    }
    if (t.id === "admin") {
      return user?.role === "ADMIN";
    }
    return true; // Tasks, Trace, Dashboard visible to all
  });
  
  // Auto-switch tab if current tab is hidden
  React.useEffect(() => {
    if (!visibleTabs.find(t => t.id === tab)) {
      setTab(visibleTabs[0]?.id || "dashboard");
    }
  }, [user, tab, visibleTabs]);

  return (
    <RequireAuth>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header className="rt-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Gavel size={22} color="var(--gold)" />
              <div>
                <div className="rt-header-title">RegTrace</div>
                <div className="rt-sans rt-header-subtitle">REGULATORY TEXT → OPERATIONAL ACTION · SEBI TechSprint 2026</div>
              </div>
            </div>
            <div className="rt-sans" style={{ fontSize: 11, textAlign: "right", display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                {documentId && <div>Document: {documentId}</div>}
                <div style={{ opacity: 0.7 }}>AI-Powered Compliance Engine</div>
              </div>
              {user && (
                <div style={{ borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 16, textAlign: "left" }}>
                  <div style={{ fontWeight: "bold" }}>{user.full_name}</div>
                  <div style={{ opacity: 0.7, marginBottom: 4 }}>{user.role}</div>
                  <button 
                    onClick={logout}
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.4)", color: "white", padding: "2px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10 }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tabs */}
        <nav className="rt-tabs rt-sans">
          {visibleTabs.map(t => {
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
          {tab === "ingest" && <IngestTab documentId={documentId} onPipelineComplete={handlePipelineComplete} />}
          {tab === "review" && <ReviewTab documentId={documentId} />}
          {tab === "tasks" && <TasksTab documentId={documentId} />}
          {tab === "trace" && <TraceTab documentId={documentId} />}
          {tab === "dashboard" && <DashboardTab documentId={documentId} />}
          {tab === "admin" && <AdminTab />}
        </main>

        {/* Footer */}
        <footer className="rt-sans rt-footer">
          RegTrace — SEBI TechSprint 2026 · Agentic Compliance Intelligence Platform
        </footer>
      </div>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
