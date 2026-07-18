import React, { useState, useEffect } from "react";
import { LayoutDashboard, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { getDashboard } from "../api/client";

export default function DashboardTab({ documentId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const data = await getDashboard(documentId);
      setStats(data);
    } catch (e) {
      console.error("Failed to load dashboard", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, [documentId]);

  if (!stats) {
    return (
      <div className="rt-card rt-sans" style={{ padding: 24, textAlign: "center", color: "var(--slate)", fontSize: 13 }}>
        {loading ? "Loading dashboard…" : "No data yet. Run the pipeline first."}
      </div>
    );
  }

  const cards = [
    { label: "Obligations Extracted", value: stats.obligations?.total || 0, color: "var(--gold)" },
    { label: "Validated", value: stats.obligations?.validated || 0, color: "var(--moss)" },
    { label: "Avg Confidence", value: `${Math.round((stats.obligations?.avg_confidence || 0) * 100)}%`, color: "var(--gold)" },
    { label: "Pending Review", value: stats.obligations?.pending || 0, color: "var(--gold)" },
    { label: "Tasks Generated", value: stats.tasks?.total || 0, color: "var(--ink)" },
    { label: "Open Tasks", value: stats.tasks?.open || 0, color: "var(--moss)" },
    { label: "In Progress", value: stats.tasks?.in_progress || 0, color: "var(--gold)" },
    { label: "Tasks Completed", value: stats.tasks?.completed || 0, color: "var(--moss)" },
    { label: "Overdue Tasks", value: stats.tasks?.overdue || 0, color: "var(--rust)" },
    { label: "Compliant", value: stats.evaluations?.compliant || 0, color: "var(--moss)" },
    { label: "Non-Compliant", value: stats.evaluations?.non_compliant || 0, color: "var(--rust)" },
    { label: "Partially Compliant", value: stats.evaluations?.partial || 0, color: "var(--gold)" },
    { label: "Total Gaps", value: stats.gaps?.total || 0, color: "var(--rust)" },
    { label: "Missing Tasks", value: stats.gaps?.missing_task || 0, color: "var(--rust)" },
    { label: "Stale Deadlines", value: stats.gaps?.stale_deadline || 0, color: "var(--gold)" },
    { label: "Unresolved Gaps", value: stats.gaps?.unresolved || 0, color: "var(--rust)" },
    { label: "Obligations Rejected", value: stats.obligations?.rejected || 0, color: "var(--rust)" },
  ];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LayoutDashboard size={18} color="var(--gold)" />
          <h2 style={{ margin: 0, fontSize: 17 }}>5 · Compliance Dashboard</h2>
        </div>
        <button onClick={fetchDashboard} className="rt-btn rt-btn-secondary rt-sans" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <RefreshCw size={13} className={loading ? "rt-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="rt-stat-grid">
        {cards.map((s, i) => (
          <div key={i} className="rt-card" style={{ padding: 16 }}>
            <div className="rt-sans rt-stat-label">{s.label}</div>
            <div className="rt-stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
