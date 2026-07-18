import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { getObligations, approveObligation, rejectObligation } from "../api/client";
import { motion, AnimatePresence } from "framer-motion";

function confClass(c) {
  if (c >= 0.8) return "bg-green-500/10 text-green-500 border-green-500/20";
  if (c >= 0.55) return "bg-primary/10 text-primary border-primary/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function ReviewTab({ documentId }) {
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchObligations = async () => {
    setLoading(true);
    try {
      const data = await getObligations(documentId);
      setObligations(data);
    } catch (e) {
      console.error("Failed to load obligations", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchObligations(); }, [documentId]);

  const handleApprove = async (ob) => {
    await approveObligation(ob.obligation_id);
    fetchObligations();
  };

  const handleReject = async (ob) => {
    await rejectObligation(ob.obligation_id);
    fetchObligations();
  };

  const pending = obligations.filter(o => o.status === "PENDING_VALIDATION");
  const validated = obligations.filter(o => o.status === "VALIDATED");
  const rejected = obligations.filter(o => o.status === "REJECTED");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 backdrop-blur-sm p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Obligation Review Queue</h2>
            <p className="text-sm text-muted-foreground">Approve or reject extracted obligations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs font-semibold uppercase tracking-wider">
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary">Pending: {pending.length}</span>
            <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-500">Validated: {validated.length}</span>
            <span className="px-2 py-1 rounded-md bg-destructive/10 text-destructive">Rejected: {rejected.length}</span>
          </div>
          <button onClick={fetchObligations} className="flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {obligations.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-[40vh] text-muted-foreground glass-card p-12 text-sm">
          No obligations found. Please run the AI pipeline in the Ingest tab.
        </div>
      )}

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4">
        <AnimatePresence>
          {obligations.map(ob => (
            <motion.div 
              layout
              key={ob.obligation_id || ob._id} 
              variants={item}
              className={`glass-card p-5 flex flex-col md:flex-row gap-4 justify-between items-start transition-all ${ob.status !== "PENDING_VALIDATION" ? "opacity-60 grayscale-[50%]" : "hover:border-primary/30"}`}
            >
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-background/50 text-primary border border-border">
                    {ob.obligation_id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${confClass(ob.confidence || 0)}`}>
                    {Math.round((ob.confidence || 0) * 100)}% Confidence
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${ob.status === 'VALIDATED' ? 'text-green-500 bg-green-500/10' : ob.status === 'REJECTED' ? 'text-destructive bg-destructive/10' : 'text-primary bg-primary/10'}`}>
                    {ob.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-foreground leading-tight">{ob.title || "Compliance Obligation"}</h3>
                  <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{ob.obligation_text || ob.description}</p>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground bg-background/30 p-2 rounded-lg inline-flex border border-border/50">
                  <span>Entity: <strong className="text-foreground font-medium">{ob.applicable_entity || ob.actor || "N/A"}</strong></span>
                  {ob.frequency && <span>Freq: <strong className="text-foreground font-medium">{ob.frequency}</strong></span>}
                  {ob.deadline && <span>Deadline: <strong className="text-foreground font-medium">{ob.deadline}</strong></span>}
                  {ob.evidence_type && <span>Evidence: <strong className="text-foreground font-medium">{ob.evidence_type}</strong></span>}
                  {ob.clause_number && <span>Clause: <strong className="text-foreground font-medium">{ob.clause_number}</strong></span>}
                </div>

                {ob.ambiguity_flags && ob.ambiguity_flags.length > 0 && (
                  <div className="flex items-center gap-2 p-3 mt-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Possible Hallucination: {ob.ambiguity_flags.join(", ").replace(/_not_found/g, " not found")}</span>
                  </div>
                )}
              </div>

              {ob.status === "PENDING_VALIDATION" && (
                <div className="flex md:flex-col gap-2 w-full md:w-auto shrink-0">
                  <button onClick={() => handleApprove(ob)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium shadow-sm shadow-green-500/20">
                    <CheckCircle2 size={16} /> Approve
                  </button>
                  <button onClick={() => handleReject(ob)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-background border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-sm font-medium">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
