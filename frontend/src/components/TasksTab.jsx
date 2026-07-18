import React, { useState, useEffect } from "react";
import { ListChecks, CheckCircle2, RefreshCw } from "lucide-react";
import { getTasks, completeTask } from "../api/client";
import { motion, AnimatePresence } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function TasksTab({ documentId }) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card/40 backdrop-blur-sm p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ListChecks size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Generated Compliance Tasks</h2>
            <p className="text-sm text-muted-foreground">Manage and complete tasks generated from obligations</p>
          </div>
        </div>
        <button onClick={fetchTasks} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {tasks.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground glass-card p-12 text-sm text-center">
          No tasks yet. Run the pipeline and approve obligations to generate tasks.
        </div>
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-3">
        <AnimatePresence>
          {tasks.map(t => (
            <motion.div 
              layout
              key={t.task_id} 
              variants={item}
              className={`glass-card p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:bg-background/40 ${t.status === 'COMPLETED' ? 'opacity-60' : ''}`}
            >
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 bg-background border border-border rounded">{t.task_id}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${t.priority === "HIGH" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/10 text-primary border-primary/20"}`}>
                    {t.priority} Priority
                  </span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${t.status === "COMPLETED" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-secondary text-secondary-foreground border-border"}`}>
                    {t.status}
                  </span>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Owner: <strong className="text-foreground">{t.owner || "Unassigned"}</strong></span>
                  <span>Dept: <strong className="text-foreground">{t.department || "—"}</strong></span>
                  {t.required_evidence && <span>Evidence: <strong className="text-foreground">{t.required_evidence}</strong></span>}
                </div>
              </div>
              
              <div className="shrink-0 flex items-center">
                {t.status !== "COMPLETED" && (
                  <button 
                    onClick={() => handleComplete(t)} 
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-lg text-sm font-medium transition-all"
                  >
                    <CheckCircle2 size={16} /> Mark Done
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
