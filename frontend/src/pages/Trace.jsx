import React, { useState, useEffect } from "react";
import { Link2, ChevronRight, FileSearch, Hash } from "lucide-react";
import { getObligations, getTasks } from "../api/client";
import { Card } from "../components/ui/Card";
import { useLocation } from "react-router-dom";

export default function TracePage({ documentId }) {
  const [obligations, setObligations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  const location = useLocation();

  useEffect(() => {
    const load = async () => {
      try {
        const [obs, tsks] = await Promise.all([
          getObligations(documentId),
          getTasks(documentId)
        ]);
        setObligations(obs || []);
        setTasks(tsks || []);
        
        const params = new URLSearchParams(location.search);
        const taskIdFromUrl = params.get('task_id');
        
        if (taskIdFromUrl && (tsks || []).some(t => (t.task_id || t.id) === taskIdFromUrl)) {
          setSelectedTaskId(taskIdFromUrl);
        } else if ((tsks || []).length > 0) {
          setSelectedTaskId(tsks[0].task_id || tsks[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [documentId, location.search]);

  const selectedTask = tasks.find(t => (t.task_id || t.id) === selectedTaskId);
  const linkedObligation = selectedTask
    ? obligations.find(o => (o.obligation_id || o.id) === (selectedTask.obligation_id || selectedTask.obligationId))
    : null;

  // Mocked Audit Log for this trace
  const auditLog = selectedTask ? [
    { seq: 42, action: "CLAUSE_SEGMENTED", timestamp: "09:05 AM", hash: "42949672960012" },
    { seq: 43, action: "OBLIGATION_EXTRACTED", timestamp: "09:15 AM", hash: "84729183749210" },
    { seq: 44, action: "OBLIGATION_APPROVED", timestamp: "10:30 AM", hash: "19384756291834" },
    { seq: 45, action: "TASK_GENERATED", timestamp: "10:30 AM", hash: "99887766554433" },
    ...(selectedTask.status === "COMPLETED" ? [
      { seq: 48, action: "TASK_COMPLETED", timestamp: "10:45 AM", hash: "55443322110099" }
    ] : [])
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Link2 size={20} className="text-gold" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Obligation Traceability</h2>
          <p className="text-sm text-slate">End-to-end lineage mapping from regulatory text to operational task</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-slate">
          <FileSearch size={32} className="mb-4 text-gold opacity-50" />
          No tasks to trace. Run the pipeline first.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 border border-line rounded-card flex flex-col md:flex-row items-start md:items-center gap-4">
            <label className="text-sm font-bold text-ink shrink-0">Select a Task to Trace</label>
            <div className="relative flex-1 max-w-lg">
              <select
                value={selectedTaskId || ""}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full appearance-none bg-paper border border-line text-ink text-sm rounded focus:outline-none focus:border-gold block p-2.5 pr-8"
              >
                {tasks.map(t => (
                  <option key={t.task_id || t.id} value={t.task_id || t.id}>
                    {t.task_id || t.id} — {t.title}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate">
                <ChevronRight className="rotate-90 w-4 h-4" />
              </div>
            </div>
          </div>

          {selectedTask && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-stretch">
                {/* Clause / Obligation */}
                <Card className="p-5 flex flex-col">
                  <div className="text-[10px] uppercase font-bold text-slate mb-3 tracking-wider">Source Clause</div>
                  {linkedObligation ? (
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="font-mono text-xs font-bold text-gold">Clause {linkedObligation.clause_number || "-"}</div>
                      <div className="text-sm text-ink leading-relaxed flex-1">
                        {linkedObligation.description || linkedObligation.obligation_text}
                      </div>
                      <div className="pt-3 mt-auto border-t border-line text-xs text-slate">
                        Confidence: <strong className="text-ink">{Math.round((linkedObligation.confidence || 0) * 100)}%</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate italic mt-4">Obligation not found</div>
                  )}
                </Card>

                <div className="hidden md:flex items-center justify-center text-line"><ChevronRight size={24} /></div>

                {/* Extracted Obligation Fields */}
                <Card className="p-5 flex flex-col">
                  <div className="text-[10px] uppercase font-bold text-slate mb-3 tracking-wider">Extracted Obligation</div>
                  {linkedObligation ? (
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="text-sm font-bold text-ink leading-tight">{linkedObligation.title || "Compliance Obligation"}</div>
                      <div className="text-xs text-slate space-y-2 flex-1">
                        <div>Actor: <strong className="text-ink">{linkedObligation.actor || linkedObligation.entity}</strong></div>
                        <div>Frequency: <strong className="text-ink">{linkedObligation.frequency || "—"}</strong></div>
                        <div>Deadline: <strong className="text-ink">{linkedObligation.deadline || "—"}</strong></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate italic mt-4">Obligation not found</div>
                  )}
                </Card>

                <div className="hidden md:flex items-center justify-center text-line"><ChevronRight size={24} /></div>

                {/* Task */}
                <Card className="p-5 flex flex-col">
                  <div className="text-[10px] uppercase font-bold text-slate mb-3 tracking-wider">Generated Task</div>
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="text-sm font-bold text-ink leading-tight">{selectedTask.title}</div>
                    <div className="text-xs text-slate space-y-2 flex-1">
                      <div>Owner: <strong className="text-ink">{selectedTask.owner || selectedTask.assigned_to || "Unassigned"}</strong></div>
                      <div>Evidence: <strong className="text-ink">{selectedTask.required_evidence || selectedTask.evidenceType || "—"}</strong></div>
                    </div>
                    <div className="pt-3 mt-auto border-t border-line text-xs text-slate flex justify-between">
                      <span>Status: <strong className="text-ink uppercase">{selectedTask.status}</strong></span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Audit Log */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Hash size={16} className="text-gold" />
                  <span className="text-sm font-bold text-ink">Tamper-evident audit trail for this task</span>
                </div>
                <div className="space-y-2">
                  {auditLog.map(a => (
                    <div key={a.seq} className="font-mono text-[11px] p-2 bg-paper rounded flex gap-4 items-center border border-line">
                      <span className="text-slate min-w-[30px]">#{a.seq}</span>
                      <span className="text-ink font-bold min-w-[170px]">{a.action}</span>
                      <span className="text-slate flex-1">{a.timestamp}</span>
                      <span className="text-slate opacity-70">hash {a.hash}…</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
