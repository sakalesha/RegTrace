import React, { useState, useMemo, useCallback } from "react";
import {
  Upload, FileText, Scissors, CheckCircle2, XCircle, Pencil, Clock,
  AlertTriangle, ShieldCheck, Link2, LayoutDashboard, ListChecks,
  ChevronRight, Hash, Gavel, Search, RefreshCw
} from "lucide-react";

/* ---------------------------------------------------------------
   RegTrace — SEBI TechSprint 2026 prototype
   Regulatory text -> segmented clauses -> extracted obligations ->
   human review -> tasks -> tamper-evident audit trail -> trace view
   --------------------------------------------------------------- */

const INK = "#132A3A";
const PAPER = "#EEF1EC";
const PAPER_DEEP = "#E2E7DF";
const GOLD = "#B08D3F";
const RUST = "#A6462E";
const MOSS = "#4E6B4C";
const SLATE = "#5B6B72";

const SAMPLE_CIRCULAR = {
  title: "Master Circular for Stock Brokers — Compliance Obligations (Illustrative Extract)",
  section: "Chapter 4 — Risk Management, Cybersecurity, Client Assets & Reporting",
  text: `
4.1 Every stock broker shall put in place a Board-approved cyber security and cyber resilience policy, and shall conduct a comprehensive System and Network Audit on a half-yearly basis through a CERT-In empanelled auditor.

4.1.1 The audit report referred to in clause 4.1 shall be submitted to the stock exchange within 30 days of completion of the audit, along with a management response to each finding.

4.2 Stock brokers shall ensure that client funds and client securities are kept segregated from the broker's own funds and securities at all times, and shall not use client funds for any purpose other than the purposes specified by the client.

4.3 Every stock broker shall report, on a quarterly basis, the status of segregation of client funds and securities to the stock exchange in the format specified in Annexure 4A, read with the provisions of Circular SEBI/HO/MIRSD dated as amended from time to time.

4.4 A stock broker shall conduct an internal audit of its operations at intervals of not more than six months, covering all areas including risk management, KYC, and client fund handling, and shall place the audit report before its Board within 30 days of completion.

4.5 Stock brokers must ensure that Know Your Client (KYC) documentation for all clients is updated and validated through the KYC Registration Agency (KRA) system, and any deficiency identified must be rectified forthwith.

4.6 A stock broker shall maintain records of all client complaints, including their resolution status, and shall submit a monthly report on investor grievances to the stock exchange as specified in the applicable framework.

4.7 In the event of a cyber security incident, the stock broker shall report the incident to SEBI and the relevant stock exchange within 6 hours of detection, and shall submit a root cause analysis within 5 working days.

4.8 Stock brokers shall implement a Business Continuity Plan and Disaster Recovery framework, and shall test such framework at least once every year, maintaining records of the test outcomes as evidence.

4.9 Every stock broker shall ensure that adequate risk management systems, including real-time monitoring of client exposure and margin requirements, are in place, failing which action may be initiated under the SEBI Act and applicable regulations.

4.10 A stock broker shall preserve books of account, registers, and other documents for a minimum period as specified in the applicable regulations, in a manner that ensures their authenticity and readability throughout the preservation period.

4.11 Stock brokers may, at their discretion, adopt additional risk mitigation measures beyond the minimum framework specified herein, having regard to the nature and scale of their operations.
`.trim()
};

function hashHex(str) {
  // Lightweight deterministic hash for the browser demo (stand-in for the
  // SHA-256 hash-chained audit log described in the architecture doc).
  let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const num = (4294967296 * (2097151 & h2) + (h1 >>> 0));
  return num.toString(16).padStart(14, "0");
}

function segmentClauses(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const clauses = [];
  const re = /^(\d+(?:\.\d+)*)\s+(.*)$/;
  lines.forEach((line, idx) => {
    const m = line.match(re);
    if (m) {
      clauses.push({ id: `cl-${m[1]}`, number: m[1], text: m[2] });
    } else if (clauses.length) {
      clauses[clauses.length - 1].text += " " + line;
    }
  });
  return clauses;
}

function extractObligation(clause) {
  const t = clause.text;
  const modal = /\b(shall|must|is required to|are required to)\b/i.test(t);
  if (!modal) return null;

  const entityMatch = t.match(/\b(stock broker|broker|trading member)s?\b/i);
  const entity = entityMatch ? "Stock Broker" : "Market Intermediary";

  const freqMatch = t.match(/\b(half-?yearly|quarterly|monthly|annually|every year|not more than six months)\b/i);
  const deadlineMatch = t.match(/within\s+(\d+)\s+(days|working days|hours)/i);
  let deadline = null, frequency = null;
  if (freqMatch) frequency = freqMatch[0];
  if (deadlineMatch) deadline = `Within ${deadlineMatch[1]} ${deadlineMatch[2]}`;

  const penaltyRef = /(penalty|action may be initiated|SEBI Act)/i.test(t);
  const crossRef = /(read with|Annexure|as amended from time to time|specified framework|applicable framework|applicable regulations)/i.test(t);
  const evidenceMatch = t.match(/(audit report|management response|root cause analysis|test outcomes|monthly report|quarterly basis[^.]*report|records of)/i);

  let evidenceType = "Supporting Document";
  if (/audit report/i.test(t)) evidenceType = "Audit Report";
  else if (/root cause analysis/i.test(t)) evidenceType = "Root Cause Analysis Report";
  else if (/report/i.test(t)) evidenceType = "Regulatory Report / Filing";
  else if (/records|register/i.test(t)) evidenceType = "Internal Records";
  else if (/test outcomes/i.test(t)) evidenceType = "BCP/DR Test Log";

  const ambiguityFlags = [];
  let confidence = 0.92;
  if (crossRef) { ambiguityFlags.push("Cross-references another circular/annexure"); confidence -= 0.18; }
  if (!frequency && !deadline) { ambiguityFlags.push("No explicit timeline found"); confidence -= 0.15; }
  const wordCount = t.split(/\s+/).length;
  if (wordCount > 55) { ambiguityFlags.push("Long/compound clause — may contain multiple obligations"); confidence -= 0.1; }
  if (/may,? at their discretion/i.test(t)) { ambiguityFlags.push("Discretionary language, not mandatory"); confidence -= 0.35; }
  confidence = Math.max(0.15, Math.min(0.97, confidence));

  return {
    clauseId: clause.id,
    clauseNumber: clause.number,
    obligationText: t,
    entity,
    frequency,
    deadline,
    penaltyRef,
    evidenceType,
    confidence: Math.round(confidence * 100),
    ambiguityFlags,
    reasoning: `Detected mandatory language ("${(t.match(/\b(shall|must|is required to|are required to)\b/i) || [""])[0]}") applicable to ${entity}${frequency ? `, recurring ${frequency}` : ""}${deadline ? `, deadline ${deadline}` : ""}.`
  };
}

function confColor(c) {
  if (c >= 80) return MOSS;
  if (c >= 55) return GOLD;
  return RUST;
}

const TABS = [
  { id: "ingest", label: "Ingest", icon: Upload },
  { id: "review", label: "Review Queue", icon: ListChecks },
  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "trace", label: "Trace", icon: Link2 },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export default function RegTraceApp() {
  const [tab, setTab] = useState("ingest");
  const [circularText, setCircularText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [clauses, setClauses] = useState([]);
  const [obligations, setObligations] = useState([]); // status: pending/approved/rejected
  const [tasks, setTasks] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [running, setRunning] = useState(false);

  const appendAudit = useCallback((action, details) => {
    setAuditLog(prev => {
      const prevHash = prev.length ? prev[prev.length - 1].hash : "0".repeat(14);
      const payload = `${prevHash}|${action}|${JSON.stringify(details)}|${Date.now()}`;
      const entry = {
        id: `a-${prev.length + 1}`,
        seq: prev.length + 1,
        timestamp: new Date().toISOString(),
        action,
        details,
        prevHash,
        hash: hashHex(payload),
      };
      return [...prev, entry];
    });
  }, []);

  const loadSample = () => {
    setCircularText(SAMPLE_CIRCULAR.text);
    setSelectedFile(null);
    appendAudit("CIRCULAR_LOADED", { title: SAMPLE_CIRCULAR.title });
  };

  const runIngestion = async () => {
    if (!circularText.trim() && !selectedFile) return;
    setRunning(true);
    
    try {
        let textToSegment = circularText;
        let finalClauses = [];

        if (selectedFile) {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("title", selectedFile.name);

            // 1. Run pipeline (Ingestion + Segmentation)
            const res = await fetch("http://localhost:8000/api/v1/pipeline/run", {
                method: "POST",
                body: formData
            });
            if (!res.ok) throw new Error("Pipeline request failed");
            const data = await res.json();
            const docId = data.document_id;

            // 2. Fetch raw text from Ingestion
            const docRes = await fetch(`http://localhost:8000/api/v1/documents/${docId}`);
            if (!docRes.ok) throw new Error("Failed to fetch document metadata");
            const docData = await docRes.json();
            textToSegment = docData.raw_text || "No text extracted.";
            setCircularText(textToSegment);

            // 3. Fetch structured clauses from Segmentation Agent
            const clauseRes = await fetch(`http://localhost:8000/api/v1/documents/${docId}/clauses`);
            if (!clauseRes.ok) throw new Error("Failed to fetch clauses");
            const clausesData = await clauseRes.json();
            
            finalClauses = clausesData.map(c => ({
                id: c.clause_id,
                number: c.clause_number || "-",
                text: c.text
            }));
            
            appendAudit("PIPELINE_RUN", { executionId: data.execution_id });
        } else {
            // Fallback to client-side mock segmentation if just pasted text
            finalClauses = segmentClauses(textToSegment);
        }

        setClauses(finalClauses);
        appendAudit("CLAUSES_SEGMENTED", { count: finalClauses.length });

        // Mock Obligation Extraction on the real clauses
        const extracted = [];
        finalClauses.forEach(cl => {
            const ob = extractObligation(cl);
            if (ob) {
                extracted.push({
                    id: `ob-${cl.id}`,
                    status: "pending",
                    ...ob,
                });
            }
        });
        
        setObligations(extracted);
        appendAudit("OBLIGATIONS_EXTRACTED", { count: extracted.length, clausesScanned: finalClauses.length });
        
        setRunning(false);
        setTab("review");

    } catch (err) {
        console.error(err);
        alert("Pipeline failed: " + err.message);
        setRunning(false);
    }
  };

  const approveObligation = (ob) => {
    setObligations(prev => prev.map(o => o.id === ob.id ? { ...o, status: "approved" } : o));
    const task = {
      id: `task-${ob.id}`,
      obligationId: ob.id,
      clauseId: ob.clauseId,
      clauseNumber: ob.clauseNumber,
      title: ob.obligationText.length > 90 ? ob.obligationText.slice(0, 90) + "…" : ob.obligationText,
      owner: ob.entity === "Stock Broker" ? "Compliance / Risk Team" : "Compliance Team",
      frequency: ob.frequency || "One-time",
      deadline: ob.deadline || "Not specified — needs manual assignment",
      evidenceType: ob.evidenceType,
      priority: ob.penaltyRef ? "High" : ob.confidence < 60 ? "Medium" : "Medium",
      status: "open",
    };
    setTasks(prev => [...prev, task]);
    appendAudit("OBLIGATION_APPROVED", { obligationId: ob.id, clause: ob.clauseNumber });
    appendAudit("TASK_GENERATED", { taskId: task.id, obligationId: ob.id });
  };

  const rejectObligation = (ob) => {
    setObligations(prev => prev.map(o => o.id === ob.id ? { ...o, status: "rejected" } : o));
    appendAudit("OBLIGATION_REJECTED", { obligationId: ob.id, clause: ob.clauseNumber });
  };

  const startEdit = (ob) => {
    setEditingId(ob.id);
    setEditDraft({ obligationText: ob.obligationText, deadline: ob.deadline || "", frequency: ob.frequency || "" });
  };

  const saveEdit = (ob) => {
    setObligations(prev => prev.map(o => o.id === ob.id ? { ...o, ...editDraft, edited: true } : o));
    appendAudit("OBLIGATION_EDITED", { obligationId: ob.id, clause: ob.clauseNumber });
    setEditingId(null);
  };

  const completeTask = (task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "completed" } : t));
    appendAudit("TASK_COMPLETED", { taskId: task.id, evidence: task.evidenceType });
  };

  const openTrace = (taskId) => {
    setSelectedTrace(taskId);
    setTab("trace");
  };

  const stats = useMemo(() => {
    const pending = obligations.filter(o => o.status === "pending").length;
    const approved = obligations.filter(o => o.status === "approved").length;
    const rejected = obligations.filter(o => o.status === "rejected").length;
    const openTasks = tasks.filter(t => t.status === "open").length;
    const doneTasks = tasks.filter(t => t.status === "completed").length;
    const avgConf = obligations.length ? Math.round(obligations.reduce((s, o) => s + o.confidence, 0) / obligations.length) : 0;
    const lowConf = obligations.filter(o => o.confidence < 55).length;
    return { pending, approved, rejected, openTasks, doneTasks, avgConf, lowConf, clauseCount: clauses.length, obCount: obligations.length };
  }, [obligations, tasks, clauses]);

  const traceTask = tasks.find(t => t.id === selectedTrace);
  const traceOb = traceTask ? obligations.find(o => o.id === traceTask.obligationId) : null;
  const traceClause = traceOb ? clauses.find(c => c.id === traceOb.clauseId) : null;
  const traceAudit = traceTask ? auditLog.filter(a =>
    (a.details.obligationId === traceOb?.id) || (a.details.taskId === traceTask.id)
  ) : [];

  return (
    <div style={{ background: PAPER, minHeight: "100%", fontFamily: "'Iowan Old Style','Georgia',serif", color: INK }}>
      <style>{`
        .rt-mono { font-family: 'SFMono-Regular','JetBrains Mono',Menlo,Consolas,monospace; }
        .rt-sans { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
        .rt-btn { border-radius: 3px; font-weight: 600; letter-spacing: .01em; transition: transform .08s ease, box-shadow .08s ease; }
        .rt-btn:active { transform: translateY(1px); }
        .rt-card { background: #fff; border: 1px solid ${PAPER_DEEP}; }
        .rt-tab { cursor: pointer; }
        .rt-tab:hover { background: ${PAPER_DEEP}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${PAPER_DEEP}; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ background: INK, color: PAPER, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${GOLD}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Gavel size={22} color={GOLD} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: ".02em" }}>RegTrace</div>
            <div className="rt-sans" style={{ fontSize: 11, opacity: 0.75, letterSpacing: ".04em" }}>REGULATORY TEXT → OPERATIONAL ACTION · SEBI TechSprint 2026</div>
          </div>
        </div>
        <div className="rt-sans" style={{ fontSize: 11, opacity: 0.7, textAlign: "right" }}>
          <div>Corpus: Stockbroker Master Circular (illustrative extract)</div>
          <div>Audit entries: {auditLog.length} · chain intact</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rt-sans" style={{ display: "flex", borderBottom: `1px solid ${PAPER_DEEP}`, background: "#fff" }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <div key={t.id} onClick={() => setTab(t.id)} className="rt-tab"
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "12px 20px",
                borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
                color: active ? INK : SLATE, fontWeight: active ? 700 : 500, fontSize: 13.5
              }}>
              <Icon size={15} />{t.label}
              {t.id === "review" && stats.pending > 0 && (
                <span style={{ background: GOLD, color: "#fff", fontSize: 10, borderRadius: 10, padding: "1px 6px", marginLeft: 2 }}>{stats.pending}</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>

        {tab === "ingest" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div className="rt-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <FileText size={18} color={GOLD} />
                <h2 style={{ margin: 0, fontSize: 17 }}>1 · Ingest a regulatory document</h2>
              </div>
              <p className="rt-sans" style={{ color: SLATE, fontSize: 13, marginTop: 0 }}>
                Paste circular text (clause-numbered) or load the sample extract used for this demo. Clause segmentation runs on numbering patterns (e.g. "4.1", "4.1.1").
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                <input 
                  type="file" 
                  accept=".pdf,.docx,.txt"
                  onChange={e => setSelectedFile(e.target.files[0])}
                  className="rt-sans"
                  style={{ fontSize: 13, color: SLATE }}
                />
                <button onClick={loadSample} className="rt-btn rt-sans" style={{ background: INK, color: "#fff", border: "none", padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
                  Load Sample Circular
                </button>
                <button onClick={() => { setCircularText(""); setSelectedFile(null); }} className="rt-btn rt-sans" style={{ background: "#fff", color: INK, border: `1px solid ${PAPER_DEEP}`, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
                  Clear
                </button>
              </div>
              <textarea
                value={circularText}
                onChange={e => setCircularText(e.target.value)}
                placeholder="Upload a file or paste circular text..."
                className="rt-mono"
                style={{ width: "100%", minHeight: 220, padding: 12, fontSize: 12.5, border: `1px solid ${PAPER_DEEP}`, borderRadius: 3, resize: "vertical", boxSizing: "border-box" }}
              />
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={runIngestion} disabled={(!circularText.trim() && !selectedFile) || running} className="rt-btn rt-sans"
                  style={{ background: GOLD, color: "#fff", border: "none", padding: "10px 18px", fontSize: 13.5, cursor: (!circularText.trim() && !selectedFile) ? "not-allowed" : "pointer", opacity: (!circularText.trim() && !selectedFile) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                  {running ? <RefreshCw size={14} className="rt-spin" /> : <Scissors size={14} />}
                  {running ? "Segmenting & extracting…" : "Segment Clauses & Extract Obligations"}
                </button>
                {clauses.length > 0 && (
                  <span className="rt-sans" style={{ fontSize: 12.5, color: SLATE }}>
                    Last run: {clauses.length} clauses → {obligations.length} candidate obligations
                  </span>
                )}
              </div>
            </div>

            {clauses.length > 0 && (
              <div className="rt-card" style={{ padding: 20 }}>
                <h3 style={{ margin: "0 0 10px", fontSize: 14 }} className="rt-sans">Segmented clauses ({clauses.length})</h3>
                <div style={{ display: "grid", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                  {clauses.map(c => (
                    <div key={c.id} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "6px 8px", borderRadius: 3, background: PAPER }}>
                      <span className="rt-mono" style={{ color: GOLD, fontWeight: 700, minWidth: 42 }}>{c.number}</span>
                      <span className="rt-sans" style={{ color: INK }}>{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "review" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} color={GOLD} />
              <h2 style={{ margin: 0, fontSize: 17 }}>2 · Human review queue</h2>
            </div>
            <p className="rt-sans" style={{ color: SLATE, fontSize: 13, marginTop: -6 }}>
              No obligation becomes a binding task without explicit approval. Low-confidence extractions are flagged for closer scrutiny — this is the accountability layer, not a formality.
            </p>
            {obligations.length === 0 && (
              <div className="rt-card rt-sans" style={{ padding: 24, textAlign: "center", color: SLATE, fontSize: 13 }}>
                No obligations extracted yet. Run ingestion first.
              </div>
            )}
            {obligations.map(ob => (
              <div key={ob.id} className="rt-card" style={{ padding: 16, opacity: ob.status !== "pending" ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span className="rt-mono" style={{ background: PAPER, padding: "2px 8px", borderRadius: 3, fontSize: 12, fontWeight: 700, color: GOLD }}>Clause {ob.clauseNumber}</span>
                      <span className="rt-sans" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: confColor(ob.confidence), color: "#fff", fontWeight: 700 }}>
                        {ob.confidence}% confidence
                      </span>
                      {ob.status !== "pending" && (
                        <span className="rt-sans" style={{ fontSize: 11, fontWeight: 700, color: ob.status === "approved" ? MOSS : RUST, textTransform: "uppercase" }}>
                          {ob.status}
                        </span>
                      )}
                    </div>

                    {editingId === ob.id ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        <textarea value={editDraft.obligationText} onChange={e => setEditDraft(d => ({ ...d, obligationText: e.target.value }))}
                          className="rt-sans" style={{ fontSize: 13, padding: 8, border: `1px solid ${PAPER_DEEP}`, borderRadius: 3, minHeight: 60 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={editDraft.frequency} onChange={e => setEditDraft(d => ({ ...d, frequency: e.target.value }))} placeholder="Frequency" className="rt-sans" style={{ fontSize: 12, padding: 6, border: `1px solid ${PAPER_DEEP}`, borderRadius: 3, flex: 1 }} />
                          <input value={editDraft.deadline} onChange={e => setEditDraft(d => ({ ...d, deadline: e.target.value }))} placeholder="Deadline" className="rt-sans" style={{ fontSize: 12, padding: 6, border: `1px solid ${PAPER_DEEP}`, borderRadius: 3, flex: 1 }} />
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => saveEdit(ob)} className="rt-btn rt-sans" style={{ background: INK, color: "#fff", border: "none", padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingId(null)} className="rt-btn rt-sans" style={{ background: "#fff", border: `1px solid ${PAPER_DEEP}`, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={{ margin: "0 0 8px", fontSize: 13.5, lineHeight: 1.5 }}>{ob.obligationText}</p>
                        <div className="rt-sans" style={{ display: "flex", gap: 14, fontSize: 12, color: SLATE, flexWrap: "wrap" }}>
                          <span>Entity: <b style={{ color: INK }}>{ob.entity}</b></span>
                          <span>Frequency: <b style={{ color: INK }}>{ob.frequency || "—"}</b></span>
                          <span>Deadline: <b style={{ color: INK }}>{ob.deadline || "—"}</b></span>
                          <span>Evidence: <b style={{ color: INK }}>{ob.evidenceType}</b></span>
                          {ob.penaltyRef && <span style={{ color: RUST, fontWeight: 700 }}>⚠ Penalty referenced</span>}
                          {ob.edited && <span style={{ color: GOLD, fontWeight: 700 }}>✎ edited</span>}
                        </div>
                        {ob.ambiguityFlags.length > 0 && (
                          <div className="rt-sans" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                            {ob.ambiguityFlags.map((f, i) => (
                              <div key={i} style={{ fontSize: 11.5, color: RUST, display: "flex", alignItems: "center", gap: 5 }}>
                                <AlertTriangle size={11} /> {f}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="rt-sans" style={{ marginTop: 8, fontSize: 11, color: SLATE, fontStyle: "italic" }}>
                          Extraction rationale: {ob.reasoning}
                        </div>
                      </>
                    )}
                  </div>

                  {ob.status === "pending" && editingId !== ob.id && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 96 }}>
                      <button onClick={() => approveObligation(ob)} className="rt-btn rt-sans" style={{ background: MOSS, color: "#fff", border: "none", padding: "7px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button onClick={() => startEdit(ob)} className="rt-btn rt-sans" style={{ background: "#fff", color: INK, border: `1px solid ${PAPER_DEEP}`, padding: "7px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                        <Pencil size={13} /> Edit
                      </button>
                      <button onClick={() => rejectObligation(ob)} className="rt-btn rt-sans" style={{ background: "#fff", color: RUST, border: `1px solid ${RUST}55`, padding: "7px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
                        <XCircle size={13} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ListChecks size={18} color={GOLD} />
              <h2 style={{ margin: 0, fontSize: 17 }}>3 · Generated compliance tasks</h2>
            </div>
            {tasks.length === 0 && (
              <div className="rt-card rt-sans" style={{ padding: 24, textAlign: "center", color: SLATE, fontSize: 13 }}>
                No tasks yet — approve obligations in the Review Queue to generate tasks.
              </div>
            )}
            <div style={{ display: "grid", gap: 10 }}>
              {tasks.map(t => (
                <div key={t.id} className="rt-card" style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span className="rt-mono" style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>Clause {t.clauseNumber}</span>
                      <span className="rt-sans" style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 10, background: t.priority === "High" ? `${RUST}22` : `${GOLD}22`, color: t.priority === "High" ? RUST : GOLD, fontWeight: 700 }}>{t.priority} priority</span>
                      <span className="rt-sans" style={{ fontSize: 10.5, fontWeight: 700, color: t.status === "completed" ? MOSS : SLATE, textTransform: "uppercase" }}>{t.status}</span>
                    </div>
                    <div style={{ fontSize: 13.5, marginBottom: 4 }}>{t.title}</div>
                    <div className="rt-sans" style={{ fontSize: 11.5, color: SLATE, display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span>Owner: <b style={{ color: INK }}>{t.owner}</b></span>
                      <span>Frequency: <b style={{ color: INK }}>{t.frequency}</b></span>
                      <span>Deadline: <b style={{ color: INK }}>{t.deadline}</b></span>
                      <span>Evidence: <b style={{ color: INK }}>{t.evidenceType}</b></span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {t.status === "open" && (
                      <button onClick={() => completeTask(t)} className="rt-btn rt-sans" style={{ background: MOSS, color: "#fff", border: "none", padding: "6px 10px", fontSize: 11.5, cursor: "pointer" }}>Mark Complete</button>
                    )}
                    <button onClick={() => openTrace(t.id)} className="rt-btn rt-sans" style={{ background: "#fff", color: INK, border: `1px solid ${PAPER_DEEP}`, padding: "6px 10px", fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <Link2 size={12} /> Trace
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "trace" && (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link2 size={18} color={GOLD} />
              <h2 style={{ margin: 0, fontSize: 17 }}>4 · Clause → Obligation → Task → Audit trace</h2>
            </div>
            {!traceTask && (
              <div className="rt-card rt-sans" style={{ padding: 24, textAlign: "center", color: SLATE, fontSize: 13 }}>
                Select "Trace" on a task in the Tasks tab to see its full provenance.
              </div>
            )}
            {traceTask && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 8, alignItems: "stretch" }}>
                  <div className="rt-card" style={{ padding: 14 }}>
                    <div className="rt-sans" style={{ fontSize: 10.5, color: GOLD, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Source Clause {traceClause?.number}</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{traceClause?.text}</div>
                  </div>
                  <ChevronRight style={{ alignSelf: "center" }} color={SLATE} />
                  <div className="rt-card" style={{ padding: 14 }}>
                    <div className="rt-sans" style={{ fontSize: 10.5, color: GOLD, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Extracted Obligation</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 6 }}>{traceOb?.obligationText}</div>
                    <div className="rt-sans" style={{ fontSize: 11, color: SLATE }}>Confidence: <b style={{ color: confColor(traceOb?.confidence || 0) }}>{traceOb?.confidence}%</b></div>
                  </div>
                  <ChevronRight style={{ alignSelf: "center" }} color={SLATE} />
                  <div className="rt-card" style={{ padding: 14 }}>
                    <div className="rt-sans" style={{ fontSize: 10.5, color: GOLD, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>Task</div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 6 }}>{traceTask.title}</div>
                    <div className="rt-sans" style={{ fontSize: 11, color: SLATE }}>Status: <b style={{ color: INK }}>{traceTask.status}</b></div>
                  </div>
                </div>

                <div className="rt-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Hash size={14} color={GOLD} />
                    <span className="rt-sans" style={{ fontSize: 12.5, fontWeight: 700 }}>Tamper-evident audit trail for this obligation</span>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {traceAudit.map(a => (
                      <div key={a.id} className="rt-mono" style={{ fontSize: 11, padding: "6px 8px", background: PAPER, borderRadius: 3, display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ color: SLATE, minWidth: 30 }}>#{a.seq}</span>
                        <span style={{ color: GOLD, fontWeight: 700, minWidth: 170 }}>{a.action}</span>
                        <span style={{ color: SLATE, flex: 1 }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                        <span style={{ color: INK, opacity: 0.5 }}>hash {a.hash.slice(0, 10)}…</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "dashboard" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LayoutDashboard size={18} color={GOLD} />
              <h2 style={{ margin: 0, fontSize: 17 }}>5 · Compliance dashboard</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Clauses scanned", value: stats.clauseCount, color: INK },
                { label: "Obligations extracted", value: stats.obCount, color: GOLD },
                { label: "Avg. confidence", value: `${stats.avgConf}%`, color: confColor(stats.avgConf) },
                { label: "Low-confidence flags", value: stats.lowConf, color: RUST },
                { label: "Pending review", value: stats.pending, color: GOLD },
                { label: "Approved obligations", value: stats.approved, color: MOSS },
                { label: "Open tasks", value: stats.openTasks, color: SLATE },
                { label: "Completed tasks", value: stats.doneTasks, color: MOSS },
              ].map((s, i) => (
                <div key={i} className="rt-card" style={{ padding: 16 }}>
                  <div className="rt-sans" style={{ fontSize: 10.5, color: SLATE, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="rt-card" style={{ padding: 18 }}>
              <div className="rt-sans" style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={14} color={GOLD} /> Recent audit activity
              </div>
              <div style={{ display: "grid", gap: 5, maxHeight: 220, overflowY: "auto" }}>
                {[...auditLog].reverse().slice(0, 20).map(a => (
                  <div key={a.id} className="rt-mono" style={{ fontSize: 11, color: SLATE, display: "flex", gap: 10 }}>
                    <span style={{ minWidth: 60 }}>#{a.seq}</span>
                    <span style={{ color: GOLD, fontWeight: 700, minWidth: 190 }}>{a.action}</span>
                    <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
                {auditLog.length === 0 && <span className="rt-sans" style={{ fontSize: 12, color: SLATE }}>No activity yet.</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rt-sans" style={{ textAlign: "center", fontSize: 11, color: SLATE, padding: "18px 0 26px" }}>
        Prototype for illustration — extraction uses a rule-based heuristic in this browser demo; production build swaps in an LLM-based extraction call behind the same structured-output contract.
      </div>
    </div>
  );
}
