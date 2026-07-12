import React, { useState, useEffect } from "react";
import { Link2, ChevronRight } from "lucide-react";
import { getObligations, getTasks } from "../api/client";

export default function TraceTab({ documentId }) {
  const [obligations, setObligations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [obs, tsks] = await Promise.all([
        getObligations(documentId),
        getTasks(documentId)
      ]);
      setObligations(obs);
      setTasks(tsks);
      if (tsks.length > 0) setSelectedTaskId(tsks[0].task_id);
    };
    load();
  }, [documentId]);

  const selectedTask = tasks.find(t => t.task_id === selectedTaskId);
  const linkedObligation = selectedTask
    ? obligations.find(o => o.obligation_id === selectedTask.obligation_id)
    : null;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link2 size={18} color="var(--gold)" />
        <h2 style={{ margin: 0, fontSize: 17 }}>4 · Obligation → Task Trace</h2>
      </div>

      {tasks.length === 0 && (
        <div className="rt-card rt-sans" style={{ padding: 24, textAlign: "center", color: "var(--slate)", fontSize: 13 }}>
          No tasks to trace. Run the pipeline first.
        </div>
      )}

      {tasks.length > 0 && (
        <>
          {/* Task Selector */}
          <div className="rt-card rt-sans" style={{ padding: 12 }}>
            <label style={{ fontSize: 12, color: "var(--slate)", marginBottom: 6, display: "block" }}>Select a task to trace:</label>
            <select
              value={selectedTaskId || ""}
              onChange={e => setSelectedTaskId(e.target.value)}
              style={{ width: "100%", padding: 8, fontSize: 13, border: "1px solid var(--paper-deep)", borderRadius: 6, fontFamily: "inherit" }}
            >
              {tasks.map(t => (
                <option key={t.task_id} value={t.task_id}>{t.task_id} — {t.title}</option>
              ))}
            </select>
          </div>

          {selectedTask && (
            <div className="rt-trace-grid">
              {/* Obligation */}
              <div className="rt-card" style={{ padding: 14 }}>
                <div className="rt-sans" style={{ fontSize: 10.5, color: "var(--gold)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                  Source Obligation
                </div>
                {linkedObligation ? (
                  <>
                    <div className="rt-sans" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{linkedObligation.title}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 6 }}>{linkedObligation.description}</div>
                    <div className="rt-sans" style={{ fontSize: 11, color: "var(--slate)" }}>
                      Actor: <b>{linkedObligation.actor}</b> · Confidence: <b>{Math.round((linkedObligation.confidence || 0) * 100)}%</b>
                    </div>
                  </>
                ) : (
                  <div className="rt-sans" style={{ fontSize: 12, color: "var(--slate)" }}>Obligation not found</div>
                )}
              </div>

              <ChevronRight style={{ alignSelf: "center" }} color="var(--slate)" />

              {/* Task */}
              <div className="rt-card" style={{ padding: 14 }}>
                <div className="rt-sans" style={{ fontSize: 10.5, color: "var(--gold)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                  Generated Task
                </div>
                <div className="rt-sans" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{selectedTask.title}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 6 }}>{selectedTask.description}</div>
                <div className="rt-sans" style={{ fontSize: 11, color: "var(--slate)" }}>
                  Owner: <b>{selectedTask.owner || "Unassigned"}</b> · Priority: <b>{selectedTask.priority}</b> · Status: <b>{selectedTask.status}</b>
                </div>
              </div>

              <ChevronRight style={{ alignSelf: "center" }} color="var(--slate)" />

              {/* Evidence / Compliance */}
              <div className="rt-card" style={{ padding: 14 }}>
                <div className="rt-sans" style={{ fontSize: 10.5, color: "var(--gold)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                  Compliance Status
                </div>
                <div className="rt-sans" style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Evidence: {selectedTask.required_evidence || "Not specified"}
                </div>
                <div className="rt-sans" style={{ fontSize: 12, color: "var(--slate)" }}>
                  Department: <b>{selectedTask.department || "—"}</b>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
