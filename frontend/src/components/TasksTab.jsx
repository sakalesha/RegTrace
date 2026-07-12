import React, { useState, useEffect } from "react";
import { ListChecks, CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { getTasks, completeTask } from "../api/client";

export default function TasksTab({ documentId, onOpenTrace }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await getTasks(documentId);
      setTasks(data);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [documentId]);

  const handleComplete = async (t) => {
    await completeTask(t.task_id);
    fetchTasks();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ListChecks size={18} color="var(--gold)" />
          <h2 style={{ margin: 0, fontSize: 17 }}>3 · Generated Compliance Tasks</h2>
        </div>
        <button onClick={fetchTasks} className="rt-btn rt-btn-secondary rt-sans" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <RefreshCw size={13} className={loading ? "rt-spin" : ""} /> Refresh
        </button>
      </div>

      {tasks.length === 0 && !loading && (
        <div className="rt-card rt-sans" style={{ padding: 24, textAlign: "center", color: "var(--slate)", fontSize: 13 }}>
          No tasks yet — run the pipeline to generate tasks from obligations.
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {tasks.map(t => (
          <div key={t.task_id} className="rt-card" style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                <span className="rt-mono" style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>{t.task_id}</span>
                <span className={`rt-badge ${t.priority === "HIGH" ? "rt-badge-rust" : "rt-badge-gold"}`}>
                  {t.priority} priority
                </span>
                <span className="rt-sans" style={{ fontSize: 10.5, fontWeight: 700, color: t.status === "COMPLETED" ? "var(--moss)" : "var(--slate)", textTransform: "uppercase" }}>
                  {t.status}
                </span>
              </div>
              <div style={{ fontSize: 13.5, marginBottom: 4, fontWeight: 500 }}>{t.title}</div>
              <div className="rt-sans" style={{ fontSize: 12, color: "var(--slate)", marginBottom: 4 }}>{t.description}</div>
              <div className="rt-sans" style={{ fontSize: 11.5, color: "var(--slate)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span>Owner: <b style={{ color: "var(--ink)" }}>{t.owner || "Unassigned"}</b></span>
                <span>Dept: <b style={{ color: "var(--ink)" }}>{t.department || "—"}</b></span>
                {t.required_evidence && <span>Evidence: <b style={{ color: "var(--ink)" }}>{t.required_evidence}</b></span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {t.status !== "COMPLETED" && (
                <button onClick={() => handleComplete(t)} className="rt-btn rt-btn-approve rt-sans">
                  <CheckCircle2 size={12} style={{ marginRight: 4 }} />Done
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
