import React, { useState, useEffect } from "react";
import { Upload, FileText, Scissors, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { runPipeline, getDocument, getDocumentClauses } from "../api/client";
import { motion, AnimatePresence } from "framer-motion";

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
          try {
            const docData = await getDocument(res.document_id);
            setRawText(docData.raw_text || "No raw text available.");
          } catch (e) {
            console.error("Failed to fetch document metadata", e);
          }

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
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Document Ingestion</h2>
          <p className="text-sm text-muted-foreground">Upload or paste regulatory text for AI analysis</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative overflow-hidden group">
            <input 
              type="file" 
              accept=".pdf,.docx,.txt"
              onChange={e => setFile(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors">
              <Upload size={14} /> {file ? file.name : "Upload File"}
            </button>
          </div>
          
          <button onClick={loadSample} className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm font-medium transition-colors">
            Load Sample
          </button>
          
          <button onClick={() => { setText(""); setFile(null); setResult(null); setError(null); setRawText(""); setClauses([]); }} className="px-4 py-2 border border-border bg-transparent hover:bg-secondary/50 rounded-lg text-sm font-medium transition-colors text-muted-foreground ml-auto">
            Clear
          </button>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Upload a file or paste circular text here..."
          className="w-full min-h-[220px] p-4 bg-background/50 border border-border rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-y"
        />

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={handleRun}
            disabled={(!text.trim() && !file) || running}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? <RefreshCw size={16} className="animate-spin" /> : <Scissors size={16} />}
            {running ? "Processing Pipeline..." : "Run AI Pipeline"}
          </button>
          
          <AnimatePresence>
            {running && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium text-primary flex items-center gap-2 animate-pulse"
              >
                Extracting text and segmenting clauses...
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3"
          >
            <AlertCircle size={18} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-sm font-bold text-green-500 mb-4 flex items-center gap-2">
            <CheckCircle size={16} /> Pipeline Complete
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-background/40 p-4 rounded-xl text-center border border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Status</div>
              <div className={`text-lg font-bold ${result.status === "SUCCESS" ? "text-green-500" : "text-destructive"}`}>
                {result.status}
              </div>
            </div>
            <div className="bg-background/40 p-4 rounded-xl text-center border border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Agents Executed</div>
              <div className="text-lg font-bold text-foreground">{result.agents_executed}</div>
            </div>
            <div className="bg-background/40 p-4 rounded-xl text-center border border-border/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Duration</div>
              <div className="text-lg font-bold text-foreground">{result.overall_duration?.toFixed(1)}s</div>
            </div>
          </div>

          {result.agent_results && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {result.agent_results.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-background/50 rounded-lg text-xs font-mono border border-border/30">
                  <span className={`font-bold w-16 shrink-0 ${a.status === "SUCCESS" ? "text-green-500" : "text-destructive"}`}>{a.status}</span>
                  <span className="text-primary font-semibold w-48 shrink-0 truncate">{a.name}</span>
                  <span className="text-muted-foreground w-12 shrink-0">{a.duration?.toFixed(2)}s</span>
                  {a.error && <span className="text-destructive truncate flex-1">— {a.error}</span>}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {rawText && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Ingestion Output (Raw Text)</h3>
            <textarea
                readOnly
                value={rawText}
                className="w-full h-48 p-4 bg-background/40 border border-border/50 rounded-xl font-mono text-xs focus:outline-none resize-y text-muted-foreground"
            />
        </motion.div>
      )}

      {clauses.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Segmented Clauses</h3>
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">{clauses.length} clauses</span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {clauses.map((c, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.02 }}
                    key={c.clause_id} 
                    className="flex gap-4 p-3 rounded-lg bg-background/40 border border-border/50 hover:bg-background/60 transition-colors"
                  >
                      <span className="font-mono text-primary font-bold text-xs shrink-0 w-10 pt-0.5">{c.clause_number || "-"}</span>
                      <span className="text-sm text-foreground/90 leading-relaxed">{c.text}</span>
                  </motion.div>
                ))}
            </div>
        </motion.div>
      )}

    </div>
  );
}
