import React, { useState, useEffect } from "react";
import { Link2, ChevronRight, FileSearch } from "lucide-react";
import { getObligations, getTasks } from "../api/client";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-card/40 backdrop-blur-sm p-4 rounded-xl border border-border">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Link2 size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Obligation to Task Traceability</h2>
          <p className="text-sm text-muted-foreground">End-to-end lineage mapping from regulatory text to operational task</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground glass-card p-12 text-sm text-center">
          <FileSearch size={32} className="mb-4 text-primary opacity-50" />
          No tasks to trace. Run the pipeline first.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Select a Task to Trace</label>
            <div className="relative">
              <select
                value={selectedTaskId || ""}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full appearance-none bg-background/50 border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 pr-8 transition-colors"
              >
                {tasks.map(t => (
                  <option key={t.task_id} value={t.task_id} className="bg-background text-foreground">
                    {t.task_id} — {t.title}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                <ChevronRight className="rotate-90 w-4 h-4" />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedTask && (
              <motion.div 
                key={selectedTaskId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-stretch"
              >
                {/* Obligation */}
                <div className="glass-card p-5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary/10"></div>
                  <div className="text-[10px] uppercase font-bold text-primary mb-3 tracking-wider">Source Obligation</div>
                  {linkedObligation ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-foreground leading-tight">{linkedObligation.title}</div>
                      <div className="text-xs text-foreground/70 leading-relaxed">{linkedObligation.description}</div>
                      <div className="pt-2 mt-2 border-t border-border/50 text-[10px] text-muted-foreground flex justify-between">
                        <span>Actor: <strong className="text-foreground">{linkedObligation.actor}</strong></span>
                        <span className="text-primary font-semibold">{Math.round((linkedObligation.confidence || 0) * 100)}% Conf</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic mt-4">Obligation not found</div>
                  )}
                </div>

                <div className="hidden md:flex items-center justify-center text-border"><ChevronRight size={24} /></div>

                {/* Task */}
                <div className="glass-card p-5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-blue-500/10"></div>
                  <div className="text-[10px] uppercase font-bold text-blue-500 mb-3 tracking-wider">Generated Task</div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground leading-tight">{selectedTask.title}</div>
                    <div className="text-xs text-foreground/70 leading-relaxed">{selectedTask.description}</div>
                    <div className="pt-2 mt-2 border-t border-border/50 text-[10px] text-muted-foreground flex justify-between flex-wrap gap-2">
                      <span>Owner: <strong className="text-foreground">{selectedTask.owner || "Unassigned"}</strong></span>
                      <span className="text-blue-500 font-semibold">{selectedTask.status}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex items-center justify-center text-border"><ChevronRight size={24} /></div>

                {/* Evidence / Compliance */}
                <div className="glass-card p-5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/50 to-green-500/10"></div>
                  <div className="text-[10px] uppercase font-bold text-green-500 mb-3 tracking-wider">Compliance Status</div>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground leading-tight">Required Evidence</div>
                    <div className="text-xs text-foreground/70 leading-relaxed border border-border/50 bg-background/30 p-2 rounded">{selectedTask.required_evidence || "Not specified"}</div>
                    <div className="pt-2 mt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                      Department: <strong className="text-foreground">{selectedTask.department || "—"}</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
