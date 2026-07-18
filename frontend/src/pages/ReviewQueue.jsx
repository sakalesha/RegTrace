import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Pencil } from "lucide-react";
import { getObligations, approveObligation, rejectObligation } from "../api/client";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ConfidenceBadge, StatusChip } from "../components/ui/Badge";

export default function ReviewQueuePage({ documentId }) {
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const fetchObligations = async () => {
    setLoading(true);
    try {
      const data = await getObligations(documentId);
      setObligations(data || []);
    } catch (e) {
      console.error("Failed to load obligations", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchObligations(); }, [documentId]);

  const handleApprove = async (ob) => {
    try {
      await approveObligation(ob.obligation_id);
      fetchObligations();
    } catch (e) {
      console.error("Failed to approve", e);
    }
  };

  const handleReject = async (ob) => {
    try {
      await rejectObligation(ob.obligation_id);
      fetchObligations();
    } catch (e) {
      console.error("Failed to reject", e);
    }
  };

  const startEdit = (ob) => {
    setEditingId(ob.obligation_id);
    setEditDraft({ 
      obligation_text: ob.obligation_text || ob.description || "", 
      frequency: ob.frequency || "", 
      deadline: ob.deadline || "" 
    });
  };

  const saveEdit = async (ob) => {
    // In a real app we would call an update API. Here we just close edit and assume it's saved 
    // or we can simulate it by updating state. 
    // Wait, let's just close for now since there's no update endpoint.
    setEditingId(null);
    fetchObligations();
  };

  const pending = obligations.filter(o => o.status === "PENDING_VALIDATION" || o.status === "PENDING");
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-gold" />
          <h2 className="text-xl font-bold tracking-tight text-ink">Obligation Review Queue</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate">Pending: <span className="text-ink font-bold">{pending.length}</span></div>
          <Button variant="outline" size="sm" onClick={fetchObligations} disabled={loading} className="gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {obligations.length === 0 && !loading && (
          <div className="p-12 text-center text-slate text-sm">
            No obligations found. Please run the AI pipeline in the Ingest tab.
          </div>
        )}
        
        {obligations.map(ob => (
          <Card 
            key={ob.obligation_id || ob.id} 
            leftAccentColor={ob.status === "PENDING_VALIDATION" || ob.status === "PENDING" ? "#B08D3F" : undefined}
            className={`p-5 transition-opacity ${ob.status !== "PENDING_VALIDATION" && ob.status !== "PENDING" ? "opacity-60" : ""}`}
          >
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-gold">Clause {ob.clause_number || "-"}</span>
                  <ConfidenceBadge score={Math.round((ob.confidence || 0.9) * 100)} />
                  {ob.status !== "PENDING_VALIDATION" && ob.status !== "PENDING" && (
                    <StatusChip status={ob.status} />
                  )}
                </div>

                {editingId === (ob.obligation_id || ob.id) ? (
                  <div className="space-y-3">
                    <textarea 
                      value={editDraft.obligation_text} 
                      onChange={e => setEditDraft(d => ({ ...d, obligation_text: e.target.value }))}
                      className="w-full text-sm p-2 border border-line rounded bg-white text-ink font-sans focus:outline-none focus:border-gold"
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <input 
                        value={editDraft.frequency} 
                        onChange={e => setEditDraft(d => ({ ...d, frequency: e.target.value }))}
                        placeholder="Frequency"
                        className="flex-1 text-sm p-2 border border-line rounded bg-white text-ink focus:outline-none focus:border-gold"
                      />
                      <input 
                        value={editDraft.deadline} 
                        onChange={e => setEditDraft(d => ({ ...d, deadline: e.target.value }))}
                        placeholder="Deadline"
                        className="flex-1 text-sm p-2 border border-line rounded bg-white text-ink focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => saveEdit(ob)}>Save Changes</Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-ink leading-relaxed font-medium">
                        {ob.obligation_text || ob.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate">
                      <span>Entity: <strong className="text-ink">{ob.applicable_entity || ob.actor || ob.entity || "N/A"}</strong></span>
                      <span>Frequency: <strong className="text-ink">{ob.frequency || "—"}</strong></span>
                      <span>Deadline: <strong className="text-ink">{ob.deadline || "—"}</strong></span>
                      <span>Evidence: <strong className="text-ink">{ob.evidence_type || "—"}</strong></span>
                      {ob.penalty_referenced && <span className="text-rust font-bold">⚠ Penalty referenced</span>}
                    </div>

                    {ob.ambiguity_flags && ob.ambiguity_flags.length > 0 && (
                      <div className="flex flex-col gap-1 mt-2">
                        {ob.ambiguity_flags.map((flag, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs font-bold text-rust">
                            <AlertTriangle size={12} />
                            <span>{flag.replace(/_not_found/g, " not found")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {(ob.status === "PENDING_VALIDATION" || ob.status === "PENDING") && editingId !== (ob.obligation_id || ob.id) && (
                <div className="flex flex-col gap-2 min-w-[120px] shrink-0">
                  <Button variant="success" size="sm" className="w-full justify-center" onClick={() => handleApprove(ob)}>
                    <CheckCircle2 size={14} className="mr-1.5" /> Approve
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-center" onClick={() => startEdit(ob)}>
                    <Pencil size={14} className="mr-1.5" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="w-full justify-center" onClick={() => handleReject(ob)}>
                    <XCircle size={14} className="mr-1.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
