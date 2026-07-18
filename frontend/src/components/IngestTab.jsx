import React, { useState, useEffect } from "react";
import { Upload, FileText, Scissors, RefreshCw } from "lucide-react";
import { runPipeline, getDocument, getDocumentClauses } from "../api/client";

const SAMPLE_TEXT = `4.1 Every stock broker shall put in place a Board-approved cyber security and cyber resilience policy, and shall conduct a comprehensive System and Network Audit on a half-yearly basis through a CERT-In empanelled auditor.

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

4.11 Stock brokers may, at their discretion, adopt additional risk mitigation measures beyond the minimum framework specified herein, having regard to the nature and scale of their operations.`;

export default function IngestTab({ documentId, onPipelineComplete }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [rawText, setRawText] = useState("");
  const [clauses, setClauses] = useState([]);

  useEffect(() => {
    if (documentId && !rawText && clauses.length === 0) {
      getDocument(documentId)
        .then(docData => setRawText(docData.raw_text || "No raw text available."))
        .catch(e => console.error("Failed to fetch document metadata", e));

      getDocumentClauses(documentId)
        .then(clausesData => setClauses(clausesData || []))
        .catch(e => console.error("Failed to fetch clauses", e));
    }
  }, [documentId]);

  const loadSample = () => {
    setText(SAMPLE_TEXT);
    setFile(null);
    setResult(null);
    setError(null);
    setRawText("");
    setClauses([]);
  };

  const handleRun = async () => {
    if (!text.trim() && !file) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setRawText("");
    setClauses([]);

    try {
      const res = await runPipeline(text, file, "Master Circular — Stock Broker Compliance");
      setResult(res);

      if (res.document_id) {
          // Fetch the ingested raw text
          try {
            const docData = await getDocument(res.document_id);
            setRawText(docData.raw_text || "No raw text available.");
          } catch (e) {
            console.error("Failed to fetch document metadata", e);
          }

          // Fetch the segmented clauses
          try {
            const clausesData = await getDocumentClauses(res.document_id);
            setClauses(clausesData || []);
          } catch (e) {
            console.error("Failed to fetch clauses", e);
          }
      }

      if (onPipelineComplete) onPipelineComplete(res);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Pipeline failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="rt-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <FileText size={18} color="var(--gold)" />
          <h2 style={{ margin: 0, fontSize: 17 }}>1 · Ingest a regulatory document</h2>
        </div>
        <p className="rt-sans" style={{ color: "var(--slate)", fontSize: 13, marginTop: 0 }}>
          Paste circular text, load the sample extract, or upload a file (PDF/DOCX). The AI pipeline will extract text and segment clauses.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <input 
            type="file" 
            accept=".pdf,.docx,.txt"
            onChange={e => setFile(e.target.files[0])}
            className="rt-sans"
            style={{ fontSize: 13, color: "var(--slate)" }}
          />
          <button onClick={loadSample} className="rt-btn rt-btn-dark rt-sans">
            Load Sample Circular
          </button>
          <button onClick={() => { setText(""); setFile(null); setResult(null); setError(null); setRawText(""); setClauses([]); }} className="rt-btn rt-btn-secondary rt-sans">
            Clear
          </button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Upload a file or paste circular text here..."
          className="rt-textarea"
        />
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleRun}
            disabled={(!text.trim() && !file) || running}
            className="rt-btn rt-btn-primary rt-sans"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {running ? <RefreshCw size={14} className="rt-spin" /> : <Scissors size={14} />}
            {running ? "Running AI Pipeline…" : "Run Full Pipeline"}
          </button>
          {running && (
            <span className="rt-sans rt-pulse" style={{ fontSize: 12.5, color: "var(--gold)" }}>
              Extracting text and segmenting clauses…
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rt-card" style={{ padding: 16, borderColor: "var(--rust)" }}>
          <p className="rt-sans" style={{ color: "var(--rust)", fontSize: 13 }}>⚠ {error}</p>
        </div>
      )}

      {result && (
        <div className="rt-card" style={{ padding: 20 }}>
          <h3 className="rt-sans" style={{ margin: "0 0 12px", fontSize: 14, color: "var(--moss)" }}>
            ✓ Pipeline Complete
          </h3>
          <div className="rt-sans" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div className="rt-card" style={{ padding: 12, textAlign: "center" }}>
              <div className="rt-stat-label">Status</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: result.status === "SUCCESS" ? "var(--moss)" : "var(--rust)" }}>
                {result.status}
              </div>
            </div>
            <div className="rt-card" style={{ padding: 12, textAlign: "center" }}>
              <div className="rt-stat-label">Agents Executed</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{result.agents_executed}</div>
            </div>
            <div className="rt-card" style={{ padding: 12, textAlign: "center" }}>
              <div className="rt-stat-label">Duration</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{result.overall_duration?.toFixed(1)}s</div>
            </div>
          </div>
          {result.agent_results && (
            <div style={{ marginTop: 14, display: "grid", gap: 4, maxHeight: 200, overflowY: "auto" }}>
              {result.agent_results.map((a, i) => (
                <div key={i} className="rt-mono" style={{ fontSize: 11, padding: "5px 8px", background: "var(--paper)", borderRadius: 4, display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: a.status === "SUCCESS" ? "var(--moss)" : "var(--rust)", fontWeight: 700, minWidth: 60 }}>{a.status}</span>
                  <span style={{ color: "var(--gold)", fontWeight: 600, minWidth: 200 }}>{a.name}</span>
                  <span style={{ color: "var(--slate)", minWidth: 40 }}>{a.duration?.toFixed(2)}s</span>
                  {a.error && <span style={{ color: "var(--rust)", fontSize: 10 }}>— {a.error.slice(0, 80)}</span>}
                </div>
              ))}
              {/* Add the async agents for architectural completeness in the UI */}
              <div className="rt-mono" style={{ fontSize: 11, padding: "5px 8px", background: "var(--paper)", borderRadius: 4, display: "flex", gap: 10, alignItems: "center", opacity: 0.8 }}>
                <span style={{ color: "var(--slate)", fontWeight: 700, minWidth: 60 }}>PENDING</span>
                <span style={{ color: "var(--gold)", fontWeight: 600, minWidth: 200 }}>HumanReviewAgent</span>
                <span style={{ color: "var(--slate)", fontSize: 10 }}>— Awaiting officer review</span>
              </div>
              <div className="rt-mono" style={{ fontSize: 11, padding: "5px 8px", background: "var(--paper)", borderRadius: 4, display: "flex", gap: 10, alignItems: "center", opacity: 0.8 }}>
                <span style={{ color: "var(--slate)", fontWeight: 700, minWidth: 60 }}>ASYNC</span>
                <span style={{ color: "var(--gold)", fontWeight: 600, minWidth: 200 }}>TaskGenerationAgent</span>
                <span style={{ color: "var(--slate)", fontSize: 10 }}>— Triggers on approval</span>
              </div>
              <div className="rt-mono" style={{ fontSize: 11, padding: "5px 8px", background: "var(--paper)", borderRadius: 4, display: "flex", gap: 10, alignItems: "center", opacity: 0.8 }}>
                <span style={{ color: "var(--slate)", fontWeight: 700, minWidth: 60 }}>DAEMON</span>
                <span style={{ color: "var(--gold)", fontWeight: 600, minWidth: 200 }}>ContinuousMonitoringAgent</span>
                <span style={{ color: "var(--slate)", fontSize: 10 }}>— Running in background</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render the Raw Text and Segments from the actual backend! */}
      {rawText && (
        <div className="rt-card" style={{ padding: 20 }}>
            <h3 className="rt-sans" style={{ margin: "0 0 10px", fontSize: 14 }}>Ingestion Output (Raw Text)</h3>
            <textarea
                readOnly
                value={rawText}
                className="rt-mono"
                style={{ width: "100%", height: 200, padding: 12, fontSize: 12, border: "1px solid var(--paper-deep)", borderRadius: 3, resize: "vertical", boxSizing: "border-box" }}
            />
        </div>
      )}

      {clauses.length > 0 && (
        <div className="rt-card" style={{ padding: 20 }}>
            <h3 className="rt-sans" style={{ margin: "0 0 10px", fontSize: 14 }}>Segmented Clauses ({clauses.length})</h3>
            <div style={{ display: "grid", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {clauses.map(c => (
                <div key={c.clause_id} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "8px", borderRadius: 3, background: "var(--paper)" }}>
                    <span className="rt-mono" style={{ color: "var(--gold)", fontWeight: 700, minWidth: 42 }}>{c.clause_number || "-"}</span>
                    <span className="rt-sans" style={{ color: "var(--ink)" }}>{c.text}</span>
                </div>
                ))}
            </div>
        </div>
      )}

    </div>
  );
}
