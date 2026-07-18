import React, { useState, useEffect } from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { getDashboard } from "../api/client";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

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
      <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground glass-card p-12 text-sm text-center">
        {loading ? (
          <>
            <RefreshCw size={24} className="animate-spin text-primary mb-4" />
            Loading compliance dashboard...
          </>
        ) : (
          "No data available. Please run the ingestion pipeline first."
        )}
      </div>
    );
  }

  const cards = [
    { label: "Obligations Extracted", value: stats.obligations?.total || 0, color: "text-primary" },
    { label: "Validated", value: stats.obligations?.validated || 0, color: "text-green-500" },
    { label: "Avg Confidence", value: `${Math.round((stats.obligations?.avg_confidence || 0) * 100)}%`, color: "text-primary" },
    { label: "Pending Review", value: stats.obligations?.pending || 0, color: "text-primary" },
    { label: "Tasks Generated", value: stats.tasks?.total || 0, color: "text-foreground" },
    { label: "Open Tasks", value: stats.tasks?.open || 0, color: "text-green-500" },
    { label: "In Progress", value: stats.tasks?.in_progress || 0, color: "text-primary" },
    { label: "Tasks Completed", value: stats.tasks?.completed || 0, color: "text-green-500" },
    { label: "Overdue Tasks", value: stats.tasks?.overdue || 0, color: "text-destructive" },
    { label: "Compliant", value: stats.evaluations?.compliant || 0, color: "text-green-500" },
    { label: "Non-Compliant", value: stats.evaluations?.non_compliant || 0, color: "text-destructive" },
    { label: "Partially Compliant", value: stats.evaluations?.partial || 0, color: "text-primary" },
    { label: "Total Gaps", value: stats.gaps?.total || 0, color: "text-destructive" },
    { label: "Missing Tasks", value: stats.gaps?.missing_task || 0, color: "text-destructive" },
    { label: "Stale Deadlines", value: stats.gaps?.stale_deadline || 0, color: "text-primary" },
    { label: "Unresolved Gaps", value: stats.gaps?.unresolved || 0, color: "text-destructive" },
    { label: "Obligations Rejected", value: stats.obligations?.rejected || 0, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-card/40 backdrop-blur-sm p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LayoutDashboard size={20} className="text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Compliance Dashboard</h2>
        </div>
        <button 
          onClick={fetchDashboard} 
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> 
          Refresh
        </button>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        {cards.map((s, i) => (
          <motion.div key={i} variants={item} className="glass-card p-5 hover:bg-white/5 transition-colors group">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 group-hover:text-foreground/70 transition-colors">{s.label}</div>
            <div className={`text-3xl font-serif font-bold ${s.color}`}>{s.value}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
