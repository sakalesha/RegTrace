import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, XCircle, Pencil, AlertTriangle, RefreshCw } from "lucide-react";
import { getObligations, approveObligation, rejectObligation } from "../api/client";

function confClass(c) {
  if (c >= 0.8) return "conf-high";
  if (c >= 0.55) return "conf-mid";
  return "conf-low";
}

function confBg(c) {
  if (c >= 0.8) return "var(--moss)";
  if (c >= 0.55) return "var(--gold)";
  return "var(--rust)";
}

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
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={18} color="var(--gold)" />
          <h2 style={{ margin: 0, fontSize: 17 }}>2 · Obligation Review Queue</h2>
        </div>
        <button onClick={fetchObligations} className="rt-btn rt-btn-secondary rt-sans" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <RefreshCw size={13} className={loading ? "rt-spin" : ""} /> Refresh
        </button>
      </div>
      <p className="rt-sans" style={{ color: "var(--slate)", fontSize: 13, marginTop: -6 }}>
        Review extracted obligations. Approve to generate compliance tasks, or reject false positives.
        <span style={{ marginLeft: 8 }}>
          <span className="rt-badge rt-badge-gold" style={{ marginRight: 4 }}>Pending: {pending.length}</span>
          <span className="rt-badge rt-badge-moss" style={{ marginRight: 4 }}>Validated: {validated.length}</span>
          <span className="rt-badge rt-badge-rust">Rejected: {rejected.length}</span>
        </span>
      </p>

      {obligations.length === 0 && !loading && (
        <div className="rt-card rt-sans" style={{ padding: 24, textAlign: "center", color: "var(--slate)", fontSize: 13 }}>
          No obligations found. Run the pipeline first.
        </div>
      )}

      {obligations.map(ob => (
        <div key={ob.obligation_id || ob._id} className="rt-card" style={{ padding: 16, opacity: ob.status !== "PENDING_VALIDATION" ? 0.6 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span className="rt-mono" style={{ background: "var(--paper)", padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>
                  {ob.obligation_id}
                </span>
                <span className="rt-badge" style={{ background: confBg(ob.confidence || 0), color: "#fff" }}>
                  {Math.round((ob.confidence || 0) * 100)}% confidence
                </span>
                <span className="rt-sans" style={{ fontSize: 11, fontWeight: 700, color: ob.status === "VALIDATED" ? "var(--moss)" : ob.status === "REJECTED" ? "var(--rust)" : "var(--gold)", textTransform: "uppercase" }}>
                  {ob.status}
                </span>
              </div>

              <p className="rt-sans" style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{ob.title || "Compliance Obligation"}</p>
              <p style={{ margin: "0 0 8px", fontSize: 13.5, lineHeight: 1.5 }}>{ob.obligation_text || ob.description}</p>

              <div className="rt-sans" style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--slate)", flexWrap: "wrap", marginBottom: 8 }}>
                <span>Entity: <b style={{ color: "var(--ink)" }}>{ob.applicable_entity || ob.actor || "N/A"}</b></span>
                {ob.frequency && <span>Freq: <b style={{ color: "var(--ink)" }}>{ob.frequency}</b></span>}
                {ob.deadline && <span>Deadline: <b style={{ color: "var(--ink)" }}>{ob.deadline}</b></span>}
                {ob.evidence_type && <span>Evidence: <b style={{ color: "var(--ink)" }}>{ob.evidence_type}</b></span>}
                {ob.clause_number && <span>Clause: <b style={{ color: "var(--ink)" }}>{ob.clause_number}</b></span>}
              </div>

              {ob.ambiguity_flags && ob.ambiguity_flags.length > 0 && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#fef2f2", borderLeft: "3px solid var(--rust)", borderRadius: 4, display: "flex", gap: 8, alignItems: "center" }}>
                  <AlertTriangle size={14} color="var(--rust)" />
                  <div className="rt-sans" style={{ fontSize: 12, color: "var(--rust)" }}>
                    <b>Possible Hallucination:</b> {ob.ambiguity_flags.join(", ").replace(/_not_found/g, " not found")}
                  </div>
                </div>
              )}
            </div>

            {ob.status === "PENDING_VALIDATION" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 96 }}>
                <button onClick={() => handleApprove(ob)} className="rt-btn rt-btn-approve rt-sans" style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                  <CheckCircle2 size={13} /> Approve
                </button>
                <button onClick={() => handleReject(ob)} className="rt-btn rt-btn-reject rt-sans" style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                  <XCircle size={13} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
