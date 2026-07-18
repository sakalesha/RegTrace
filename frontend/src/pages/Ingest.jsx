import React, { useState, useEffect, useRef } from "react";
import { Upload, FileText, Settings, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { runPipeline, getDocument, getDocumentClauses, getPipelineStatus } from "../api/client";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

const SAMPLE_TEXT = `4.1 Every stock broker shall put in place a Board-approved cyber security and cyber resilience policy, and shall conduct a comprehensive System and Network Audit on a half-yearly basis through a CERT-In empanelled auditor.

4.1.1 The audit report referred to in clause 4.1 shall be submitted to the stock exchange within 30 days of completion of the audit, along with a management response to each finding.

4.2 Stock brokers shall ensure that client funds and client securities are kept segregated from the broker's own funds and securities at all times.`;

export default function IngestPage({ documentId, onPipelineComplete }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [rawText, setRawText] = useState("");
  const [clauses, setClauses] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(null);
  
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (documentId && !rawText && clauses.length === 0) {
      getDocument(documentId)
        .then(docData => setRawText(docData.raw_text || ""))
        .catch(e => console.error(e));

      getDocumentClauses(documentId)
        .then(clausesData => setClauses(clausesData || []))
        .catch(e => console.error(e));
    }
  }, [documentId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const loadSample = () => {
    setText(SAMPLE_TEXT);
    setFile(null);
    setResult(null);
    setError(null);
    setRawText("");
    setClauses([]);
    setCurrentAgent(null);
  };

  const handleRun = async () => {
    if (!text.trim() && !file) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setRawText("");
    setClauses([]);
    setCurrentAgent("Initializing...");

    try {
      const res = await runPipeline(text, file, "Regulatory Circular");
      
      if (res.status === "ACCEPTED") {
        const executionId = res.execution_id;
        startPolling(executionId);
      } else {
        // Fallback if backend returned immediate result
        handlePipelineSuccess(res);
      }
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Pipeline failed to start.");
      setRunning(false);
      setCurrentAgent(null);
    }
  };

  const startPolling = (executionId) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await getPipelineStatus(executionId);
        
        if (statusRes.status === "SUCCESS") {
          clearInterval(pollIntervalRef.current);
          handlePipelineSuccess(statusRes);
        } else if (statusRes.status === "FAILED") {
          clearInterval(pollIntervalRef.current);
          setError("Pipeline execution failed.");
          setResult(statusRes);
          setRunning(false);
          setCurrentAgent(null);
        } else {
          // Still running
          setCurrentAgent(statusRes.current_agent || "Processing...");
          setResult(statusRes); // Update partial results (e.g. completed agents)
        }
      } catch (e) {
        console.error("Polling error:", e);
        clearInterval(pollIntervalRef.current);
        setError("Lost connection to pipeline status.");
        setRunning(false);
        setCurrentAgent(null);
      }
    }, 3000); // Poll every 3 seconds
  };

  const handlePipelineSuccess = async (res) => {
    setResult(res);
    
    try {
      if (res.document_id) {
        const [d, c] = await Promise.all([
          getDocument(res.document_id).catch(() => ({ raw_text: "" })),
          getDocumentClauses(res.document_id).catch(() => [])
        ]);
        setRawText(d.raw_text || "");
        setClauses(c || []);
      }
    } catch (e) {
      console.error("Failed to fetch document/clauses after pipeline success", e);
    }

    if (onPipelineComplete) onPipelineComplete(res);
    setRunning(false);
    setCurrentAgent(null);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <Upload size={20} className="text-gold" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Document Ingestion</h2>
          <p className="text-sm text-slate">Upload regulatory text for multi-agent extraction</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* Left Column: Upload */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col p-6 h-full border-line shadow-none">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-ink">Source Input</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadSample} disabled={running}>Sample</Button>
                <Button variant="ghost" size="sm" onClick={() => { setText(""); setFile(null); }} disabled={running}>Clear</Button>
              </div>
            </div>
            
            <div className="relative mb-4">
              <input 
                type="file" 
                accept=".pdf,.docx,.txt"
                onChange={e => setFile(e.target.files[0])}
                disabled={running}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={`w-full flex items-center justify-center border-2 border-dashed border-line rounded bg-paper h-20 text-sm font-bold text-slate transition-colors ${running ? 'opacity-50' : 'group hover:border-gold'}`}>
                {file ? file.name : "Drag and drop or click to upload file"}
              </div>
            </div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={running}
              placeholder="Or paste plain text here..."
              className="flex-1 w-full p-4 bg-paper border border-line rounded text-sm text-ink focus:outline-none focus:border-gold font-sans resize-none mb-4 min-h-[250px] disabled:opacity-50"
            />

            <Button 
              variant="primary" 
              size="lg" 
              className="w-full h-12 text-sm font-bold shadow-none flex items-center justify-center gap-2" 
              onClick={handleRun}
              disabled={(!text.trim() && !file) || running}
            >
              {running && <Loader2 size={16} className="animate-spin" />}
              {running ? "Processing in Background..." : "Run AI Pipeline"}
            </Button>
          </Card>
        </div>

        {/* Right Column: Preview & Status */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col p-6 h-full border-line shadow-none bg-paper/50">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-ink flex items-center gap-2">
                <Settings size={16} className="text-gold" /> Pipeline Output
              </label>
            </div>

            {error && (
              <div className="p-4 bg-rust/10 border border-rust/20 text-rust text-sm font-bold rounded flex gap-2 items-center mb-4">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {!running && !result && !rawText ? (
              <div className="flex-1 flex items-center justify-center text-slate text-sm">
                Output will appear here after processing.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                
                {/* Active Polling Status */}
                {running && (
                  <div className="p-4 bg-white border border-line rounded flex items-center gap-3 shadow-sm">
                    <Loader2 size={20} className="animate-spin text-gold" />
                    <div>
                      <div className="text-sm font-bold text-ink">Background Agents Running</div>
                      <div className="text-xs text-slate">{currentAgent || "Waiting..."}</div>
                    </div>
                  </div>
                )}

                {/* Final or Partial Result Stats */}
                {result && result.status === "SUCCESS" && (
                  <div className="p-4 bg-white border border-line rounded">
                    <div className="flex items-center gap-2 text-moss font-bold text-sm mb-3">
                      <CheckCircle2 size={16} /> Completed in {result.overall_duration?.toFixed(1)}s
                    </div>
                    {result.agent_results?.map((a, i) => (
                      <div key={i} className="flex justify-between text-[11px] font-mono py-1 border-b border-line last:border-0">
                        <span className="text-ink font-bold">{a.name}</span>
                        <span className={a.status === "SUCCESS" ? "text-moss" : "text-rust"}>
                          {a.status} ({a.duration?.toFixed(2)}s)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Clauses Result */}
                {clauses.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate uppercase tracking-wider mb-2 mt-4">Extracted Clauses ({clauses.length})</h3>
                    <div className="space-y-2">
                      {clauses.map(c => (
                        <div key={c.clause_id} className="p-3 bg-white border border-line rounded flex gap-3 shadow-sm">
                          <span className="font-mono text-[10px] font-bold text-gold shrink-0">{c.clause_number}</span>
                          <span className="text-xs text-ink">{c.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
