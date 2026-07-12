import React, { useState } from "react";
import { Upload, FileText, Scissors, RefreshCw } from "lucide-react";
import { runPipeline } from "../api/client";

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

export default function IngestTab({ onPipelineComplete }) {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const loadSample = () => {
    setText(SAMPLE_TEXT);
    setResult(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!text.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await runPipeline(text, "Master Circular — Stock Broker Compliance");
      setResult(res);
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
          Paste circular text or load the sample extract. The full AI pipeline will extract obligations, generate tasks, evaluate compliance, and produce an audit report.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={loadSample} className="rt-btn rt-btn-dark rt-sans">
            Load Sample Circular
          </button>
          <button onClick={() => { setText(""); setResult(null); setError(null); }} className="rt-btn rt-btn-secondary rt-sans">
            Clear
          </button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="4.1 Every stock broker shall …"
          className="rt-textarea"
        />
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleRun}
            disabled={!text.trim() || running}
            className="rt-btn rt-btn-primary rt-sans"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {running ? <RefreshCw size={14} className="rt-spin" /> : <Scissors size={14} />}
            {running ? "Running AI Pipeline…" : "Run Full Pipeline"}
          </button>
          {running && (
            <span className="rt-sans rt-pulse" style={{ fontSize: 12.5, color: "var(--gold)" }}>
              Extracting obligations, generating tasks, evaluating compliance…
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
                  <span style={{ color: "var(--slate)" }}>{a.duration?.toFixed(2)}s</span>
                  {a.error && <span style={{ color: "var(--rust)", fontSize: 10 }}>— {a.error.slice(0, 80)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
