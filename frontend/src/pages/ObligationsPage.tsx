import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { api } from '../lib/api';
import { anyDocumentProcessing } from '../lib/pipelineStatus';
import { CheckCircle, XCircle, AlertCircle, Edit, Search, CheckSquare, Play, Loader2, FileSearch, FileSpreadsheet } from 'lucide-react';

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface Obligation {
  id: string;
  document_id: string;
  clause_id: string;
  actor: string;
  action: string;
  condition?: string;
  deadline?: string;
  frequency?: string;
  is_mandatory: boolean;
  confidence_score: number;
  status: string;
}

interface DocumentRecord {
  document_id: string;
  title?: string;
  processing_status?: string;
}

// Document states that mean obligation extraction is still queued or running.
const EXTRACTING_STATUSES = new Set([
  'UPLOADED',
  'PARSED',
  'CHUNKED',
  'EMBEDDED',
  'CLAUSES_CREATED',
  'EXTRACTING_OBLIGATIONS',
]);

export const ObligationsPage = () => {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeObId, setActiveObId] = useState<string | null>(null);
  const [activeClauseText, setActiveClauseText] = useState<string | null>(null);
  const [loadingClause, setLoadingClause] = useState(false);

  // Manual extraction control
  const [extractDocumentId, setExtractDocumentId] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Document filter
  const [selectedDocument, setSelectedDocument] = useState('');
  const selectedDocumentRef = useRef('');
  useEffect(() => {
    selectedDocumentRef.current = selectedDocument;
  }, [selectedDocument]);

  const anyProcessing = anyDocumentProcessing(documents);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    // Initial fetch
    fetchObligations();
    fetchDocuments();

    if (!anyProcessing) return;

    // Poll every 5 seconds only while a document is still being processed
    intervalId = setInterval(() => {
      fetchObligations(false);
      fetchDocuments();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [anyProcessing]);

  useEffect(() => {
    async function fetchClauseText() {
      if (!activeObId) {
        setActiveClauseText(null);
        return;
      }

      const ob = obligations.find(o => o.id === activeObId);
      if (!ob) return;

      try {
        setLoadingClause(true);
        const clause = await api.clauses.getById(ob.clause_id);
        setActiveClauseText(clause.text);
      } catch (err) {
        console.error("Failed to fetch clause text:", err);
        setActiveClauseText("Error loading original text. Please try again.");
      } finally {
        setLoadingClause(false);
      }
    }

    fetchClauseText();
  }, [activeObId, obligations]);

  const fetchObligations = async (showLoading = true, documentId?: string) => {
    try {
      if (showLoading) setLoading(true);
      const filterDocId = documentId ?? selectedDocumentRef.current;
      const data = await api.obligations.getObligations(filterDocId || undefined);
      setObligations(data);
      setExtractError(null);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const data = await api.documents.list();
      setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  const handleDocumentFilterChange = (value: string) => {
    setSelectedDocument(value);
    fetchObligations(true, value);
  };

  const handleExportCsv = () => {
    downloadCsv(
      `obligations${selectedDocument ? `_${selectedDocument.slice(0, 8)}` : ''}.csv`,
      ['ID', 'Document ID', 'Clause ID', 'Actor', 'Action', 'Condition', 'Deadline', 'Frequency', 'Mandatory', 'Confidence', 'Status'],
      obligations.map(ob => [
        ob.id,
        ob.document_id,
        ob.clause_id,
        ob.actor,
        ob.action,
        ob.condition ?? '',
        ob.deadline ?? '',
        ob.frequency ?? '',
        ob.is_mandatory ? 'Yes' : 'No',
        ob.confidence_score,
        ob.status,
      ])
    );
  };

  const handleStartExtraction = async (documentId: string) => {
    if (!documentId) return;
    setIsExtracting(true);
    setExtractError(null);
    try {
      await api.obligations.extract(documentId);
    } catch (err: any) {
      setExtractError(err.message || "Failed to start extraction.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReview = async (id: string, status: string) => {
    try {
      await api.obligations.review(id, { status });
      setObligations(prev => prev.filter(ob => ob.id !== id || status === 'EDITED'));
      if (status === 'APPROVED' || status === 'REJECTED') {
        fetchObligations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.obligations.bulkApprove(Array.from(selectedIds));
      setSelectedIds(new Set());
      fetchObligations();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.9) return <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]">High</span>;
    if (score >= 0.7) return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-medium border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]">Med</span>;
    return <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-medium border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse">Low</span>;
  };

  const pendingObligations = obligations.filter(o => o.status === 'PENDING');
  const totalCount = obligations.length;
  const pendingCount = pendingObligations.length;

  const extractingDocs = documents.filter(d => EXTRACTING_STATUSES.has(d.processing_status ?? ''));
  const failedDocs = documents.filter(d => d.processing_status === 'EXTRACTION_FAILED');

  const hasNoObligations = totalCount === 0 && extractingDocs.length === 0 && failedDocs.length === 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Obligation Review
            </h1>
            <p className="mt-2 text-sm text-gray-400">Validate AI-extracted regulatory requirements.</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCsv}
              disabled={obligations.length === 0}
              className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-150 ${
                obligations.length > 0
                  ? 'border border-border bg-card text-foreground hover:bg-muted/80'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleBulkApprove}
              disabled={selectedIds.size === 0}
              className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-150 ${
                selectedIds.size > 0
                  ? 'bg-accent text-accent-foreground shadow-sm hover:bg-accent/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <CheckSquare className="w-5 h-5" />
              <span>Bulk Approve ({selectedIds.size})</span>
            </button>
          </div>
        </div>

        {/* Extraction status banner */}
        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            View obligations for document
          </label>
          <select
            value={selectedDocument}
            onChange={e => handleDocumentFilterChange(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All documents</option>
            {documents.map(doc => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.title ?? doc.document_id}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedDocument
              ? <>Showing obligations for <span className="font-medium text-foreground">{documents.find(d => d.document_id === selectedDocument)?.title ?? selectedDocument}</span>.</>
              : 'Select a document to review just its extracted obligations, or leave on "All documents" to see everything.'}
          </p>
        </div>

        {/* Extraction status banner */}
        {extractingDocs.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Obligation extraction in progress
              </p>
              <p className="mt-1 text-amber-600/80 dark:text-amber-400/80">
                {extractingDocs.map(d => d.title ?? d.document_id).join(', ')} is being analyzed.
                Obligations will appear here automatically once extraction completes.
              </p>
            </div>
          </div>
        )}

        {failedDocs.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-500">
                Extraction failed for {failedDocs.map(d => d.title ?? d.document_id).join(', ')}
              </p>
              <p className="mt-1 text-red-500/80">
                Select the document below and click "Start Extraction" to retry.
              </p>
            </div>
          </div>
        )}

        {/* Manual extraction control */}
        {documents.length > 0 && (
          <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Document
              </label>
              <select
                value={extractDocumentId}
                onChange={e => setExtractDocumentId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a document to extract obligations...</option>
                {documents.map(doc => (
                  <option key={doc.document_id} value={doc.document_id}>
                    {doc.title ?? doc.document_id} ({doc.processing_status ?? 'UNKNOWN'})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => handleStartExtraction(extractDocumentId)}
              disabled={!extractDocumentId || isExtracting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isExtracting ? "Starting..." : "Start Extraction"}
            </button>
            {extractError && <p className="text-xs text-red-500 basis-full mt-1">{extractError}</p>}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
            </div>
            <p className="text-indigo-500 font-medium animate-pulse">AI is analyzing regulatory text...</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left side: List */}
            <div className="w-full lg:w-2/3 space-y-4">
              {totalCount > 0 && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm text-muted-foreground">
                    {totalCount} obligation{totalCount > 1 ? 's' : ''}
                    {pendingCount > 0 && <span className="text-amber-500"> · {pendingCount} pending review</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedDocument
                      ? (documents.find(d => d.document_id === selectedDocument)?.title ?? selectedDocument)
                      : 'All documents'}
                  </p>
                </div>
              )}

              {obligations.map(ob => (
                <div
                  key={ob.id}
                  onClick={() => setActiveObId(ob.id)}
                  className={`p-5 rounded-xl border transition-all duration-150 cursor-pointer ${
                    activeObId === ob.id
                      ? 'border-primary shadow-sm bg-card'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ob.id)}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(ob.id); }}
                        className="mt-1.5 w-5 h-5 rounded border-input text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Clause: {ob.clause_id}</span>
                          {getConfidenceBadge(ob.confidence_score)}
                          {ob.is_mandatory && <span className="text-xs font-semibold text-red-500 border border-red-200 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">Mandatory</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            ob.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                            ob.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>{ob.status}</span>
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 font-medium leading-relaxed mb-2">{ob.action}</p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500">Actor</span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{ob.actor}</span>
                          </div>

                          {ob.condition && (
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-gray-500">Condition</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{ob.condition}</span>
                            </div>
                          )}

                          {ob.deadline && (
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-gray-500">Deadline</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{ob.deadline}</span>
                            </div>
                          )}

                          {ob.frequency && (
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-gray-500">Frequency</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{ob.frequency}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end space-x-2 border-t dark:border-gray-800 pt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReview(ob.id, 'REJECTED'); }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); /* trigger edit modal */ }}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReview(ob.id, 'APPROVED'); }}
                      className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-medium transition-colors flex items-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty states - distinguish extraction in progress from genuinely empty */}
              {totalCount === 0 && hasNoObligations && (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                  <FileSearch className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No obligations yet</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Upload a document and processing will extract obligations in the background,
                    or select a document above to start extraction manually.
                  </p>
                </div>
              )}

              {totalCount === 0 && extractingDocs.length > 0 && (
                <div className="text-center py-12 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-2xl">
                  <Loader2 className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-spin" />
                  <p className="text-amber-500 font-medium">Extracting obligations...</p>
                  <p className="mt-1 text-sm text-amber-500/70">
                    New obligations will appear here as soon as extraction completes.
                  </p>
                </div>
              )}

              {totalCount === 0 && failedDocs.length > 0 && (
                <div className="text-center py-12 border-2 border-dashed border-red-300 dark:border-red-800 rounded-2xl">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-red-500 font-medium">Extraction failed for a document</p>
                  <p className="mt-1 text-sm text-red-500/70">
                    Use the "Start Extraction" control above to retry.
                  </p>
                </div>
              )}
            </div>

            {/* Right side: Context Pane */}
            <div className="w-full lg:w-1/3">
              <div className="sticky top-8 p-6 rounded-xl border border-border bg-card h-[calc(100vh-6rem)] overflow-y-auto shadow-sm">
                <h3 className="text-lg font-semibold flex items-center space-x-2 mb-4">
                  <Search className="w-5 h-5 text-primary" />
                  <span>Context View</span>
                </h3>
                {activeObId ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-4">Original regulatory text for this obligation:</p>
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-sm leading-relaxed text-gray-700 dark:text-gray-300 italic">
                      {loadingClause ? (
                        <span className="flex items-center space-x-2 text-indigo-400 animate-pulse">
                          <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
                          <span>Loading original text...</span>
                        </span>
                      ) : (
                        activeClauseText || "No text available."
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                    <AlertCircle className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
                    <p className="text-sm text-gray-400">Select an obligation to view its original regulatory context here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};