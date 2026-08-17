import { useEffect, useRef, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { api } from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { anyDocumentProcessing } from '../lib/pipelineStatus';
import {
  Loader2,
  Edit,
  CheckCircle2,
  XCircle,
  Play,
  FileSpreadsheet,
  FileSearch,
  CheckSquare,
  Search,
  AlertCircle,
  History,
} from 'lucide-react';
import { PageHeader } from '../components/ui/page-header';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { StatusBadge, type Tone } from '../components/ui/StatusBadge';
import { Select, Input, Textarea } from '../components/ui/input';
import { Modal } from '../components/ui/modal';
import { Drawer } from '../components/ui/drawer';
import { EmptyState } from '../components/ui/empty-state';
import { PageLoading } from '../components/ui/spinner';

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

function obligationTone(status: string): Tone {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'destructive';
  return 'warning';
}

function reviewActionTone(action: string): Tone {
  if (action === 'APPROVE') return 'success';
  if (action === 'REJECT') return 'destructive';
  return 'warning';
}

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

  // Review modal (edit + comment/reviewer) and history drawer
  const [reviewModalOb, setReviewModalOb] = useState<Obligation | null>(null);
  const [historyOb, setHistoryOb] = useState<string | null>(null);
  const [historyReviews, setHistoryReviews] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editForm, setEditForm] = useState({ actor: '', action: '', condition: '', deadline: '', frequency: '', is_mandatory: false });
  const [reviewComment, setReviewComment] = useState('');
  const [reviewReviewer, setReviewReviewer] = useState('');

  const openReviewModal = (ob: Obligation) => {
    setEditForm({
      actor: ob.actor,
      action: ob.action,
      condition: ob.condition ?? '',
      deadline: ob.deadline ?? '',
      frequency: ob.frequency ?? '',
      is_mandatory: ob.is_mandatory,
    });
    setReviewComment('');
    setReviewReviewer('');
    setReviewModalOb(ob);
  };

  const submitReview = async (status: string) => {
    if (!reviewModalOb) return;
    const data: any = {
      status,
      comment: reviewComment || undefined,
      reviewer: reviewReviewer || undefined,
    };
    if (status === 'EDITED') {
      data.actor = editForm.actor;
      data.action = editForm.action;
      data.condition = editForm.condition || undefined;
      data.deadline = editForm.deadline || undefined;
      data.frequency = editForm.frequency || undefined;
      data.is_mandatory = editForm.is_mandatory;
    }
    try {
      await api.obligations.review(reviewModalOb.id, data);
      setReviewModalOb(null);
      fetchObligations();
    } catch (err) {
      console.error(err);
    }
  };

  const openHistory = async (id: string) => {
    setHistoryOb(id);
    setHistoryLoading(true);
    try {
      const res = await api.obligations.getReviews(id);
      setHistoryReviews(res.reviews || []);
    } catch (err) {
      console.error(err);
      setHistoryReviews([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.9) return <StatusBadge status="High" tone="success" icon={false} />;
    if (score >= 0.7) return <StatusBadge status="Medium" tone="warning" icon={false} />;
    return <StatusBadge status="Low" tone="destructive" icon={false} />;
  };

  const pendingObligations = obligations.filter(o => o.status === 'PENDING');
  const totalCount = obligations.length;
  const pendingCount = pendingObligations.length;

  const extractingDocs = documents.filter(d => EXTRACTING_STATUSES.has(d.processing_status ?? ''));
  const failedDocs = documents.filter(d => d.processing_status === 'EXTRACTION_FAILED');

  const hasNoObligations = totalCount === 0 && extractingDocs.length === 0 && failedDocs.length === 0;

  return (
    <AppLayout>
      <PageHeader
        title="Obligation Review"
        description="Validate AI-extracted regulatory requirements."
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={obligations.length === 0}
              aria-disabled={obligations.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkApprove}
              disabled={selectedIds.size === 0}
              aria-disabled={selectedIds.size === 0}
            >
              <CheckSquare className="h-4 w-4" />
              Bulk Approve ({selectedIds.size})
            </Button>
          </>
        }
      />

      {/* Document filter */}
      <Card className="mt-6">
        <CardContent className="space-y-1.5">
          <label htmlFor="obligation-document-filter" className="block text-xs font-medium text-muted-foreground">
            View obligations for document
          </label>
          <Select
            id="obligation-document-filter"
            value={selectedDocument}
            onChange={(e) => handleDocumentFilterChange(e.target.value)}
          >
            <option value="">All documents</option>
            {documents.map(doc => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.title ?? doc.document_id}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            {selectedDocument
              ? <>Showing obligations for <span className="font-medium text-foreground">{documents.find(d => d.document_id === selectedDocument)?.title ?? selectedDocument}</span>.</>
              : 'Select a document to review just its extracted obligations, or leave on "All documents" to see everything.'}
          </p>
        </CardContent>
      </Card>

      {/* Extraction status banners */}
      {extractingDocs.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-warning" aria-hidden="true" />
          <div>
            <p className="font-medium text-warning">Obligation extraction in progress</p>
            <p className="mt-1 text-warning/80">
              {extractingDocs.map(d => d.title ?? d.document_id).join(', ')} is being analyzed.
              Obligations will appear here automatically once extraction completes.
            </p>
          </div>
        </div>
      )}

      {failedDocs.length > 0 && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-medium text-destructive">
              Extraction failed for {failedDocs.map(d => d.title ?? d.document_id).join(', ')}
            </p>
            <p className="mt-1 text-destructive/80">
              Select the document below and click "Start Extraction" to retry.
            </p>
          </div>
        </div>
      )}

      {/* Manual extraction control */}
      {documents.length > 0 && (
        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="extract-document" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Document
            </label>
            <Select
              id="extract-document"
              value={extractDocumentId}
              onChange={(e) => setExtractDocumentId(e.target.value)}
            >
              <option value="">Select a document to extract obligations...</option>
              {documents.map(doc => (
                <option key={doc.document_id} value={doc.document_id}>
                  {doc.title ?? doc.document_id} ({doc.processing_status ?? 'UNKNOWN'})
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant="primary"
            onClick={() => handleStartExtraction(extractDocumentId)}
            disabled={!extractDocumentId || isExtracting}
            aria-disabled={!extractDocumentId || isExtracting}
          >
            {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isExtracting ? "Starting..." : "Start Extraction"}
          </Button>
          {extractError && <p className="basis-full mt-1 text-xs text-destructive">{extractError}</p>}
        </div>
      )}

      {loading ? (
        <PageLoading label="AI is analyzing regulatory text..." />
      ) : (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          {/* Left side: List */}
          <div className="w-full space-y-4 lg:w-2/3">
            {totalCount > 0 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-muted-foreground">
                  {totalCount} obligation{totalCount > 1 ? 's' : ''}
                  {pendingCount > 0 && <span className="text-warning"> · {pendingCount} pending review</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedDocument
                    ? (documents.find(d => d.document_id === selectedDocument)?.title ?? selectedDocument)
                    : 'All documents'}
                </p>
              </div>
            )}

            {obligations.map(ob => (
              <Card
                key={ob.id}
                onClick={() => setActiveObId(ob.id)}
                className={`cursor-pointer transition-all duration-150 ${
                  activeObId === ob.id ? 'border-primary shadow-md' : 'hover:border-primary/50'
                }`}
              >
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Select obligation ${ob.id}`}
                        checked={selectedIds.has(ob.id)}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(ob.id); }}
                        className="mt-1.5 h-5 w-5 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">Clause: {ob.clause_id}</span>
                          {getConfidenceBadge(ob.confidence_score)}
                          {ob.is_mandatory && (
                            <span className="rounded-md border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                              Mandatory
                            </span>
                          )}
                          <StatusBadge tone={obligationTone(ob.status)}>{ob.status}</StatusBadge>
                        </div>
                        <p className="mb-2 font-medium leading-relaxed text-foreground">{ob.action}</p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Actor</span>
                            <span className="text-sm font-medium text-foreground">{ob.actor}</span>
                          </div>

                          {ob.condition && (
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Condition</span>
                              <span className="text-sm text-foreground">{ob.condition}</span>
                            </div>
                          )}

                          {ob.deadline && (
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Deadline</span>
                              <span className="text-sm text-foreground">{ob.deadline}</span>
                            </div>
                          )}

                          {ob.frequency && (
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Frequency</span>
                              <span className="text-sm text-foreground">{ob.frequency}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleReview(ob.id, 'REJECTED'); }}
                      title="Reject"
                      aria-label="Reject obligation"
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openHistory(ob.id); }}
                      title="Review history"
                      aria-label="Review history"
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <History className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openReviewModal(ob); }}
                      title="Edit & review"
                      aria-label="Edit and review obligation"
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleReview(ob.id, 'APPROVED'); }}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Empty states - distinguish extraction in progress from genuinely empty */}
            {totalCount === 0 && hasNoObligations && (
              <EmptyState
                icon={FileSearch}
                title="No obligations yet"
                description="Upload a document and processing will extract obligations in the background, or select a document above to start extraction manually."
              />
            )}

            {totalCount === 0 && extractingDocs.length > 0 && (
              <EmptyState
                icon={Loader2}
                variant="extracting"
                title="Extracting obligations..."
                description="New obligations will appear here as soon as extraction completes."
              />
            )}

            {totalCount === 0 && failedDocs.length > 0 && (
              <EmptyState
                icon={AlertCircle}
                variant="error"
                title="Extraction failed for a document"
                description='Use the "Start Extraction" control above to retry.'
              />
            )}
          </div>

          {/* Right side: Context Pane */}
          <div className="w-full lg:w-1/3">
            <Card className="sticky top-8 h-[calc(100vh-6rem)] overflow-y-auto">
              <CardContent>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Search className="h-5 w-5 text-primary" />
                  Context View
                </h3>
                {activeObId ? (
                  <div>
                    <p className="mb-4 text-sm text-muted-foreground">Original regulatory text for this obligation:</p>
                    <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm leading-relaxed italic text-foreground">
                      {loadingClause ? (
                        <span className="flex items-center gap-2 text-primary/70">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading original text...
                        </span>
                      ) : (
                        activeClauseText || "No text available."
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center px-4 text-center">
                    <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">Select an obligation to view its original regulatory context here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Review modal: edit obligation fields + reviewer/comment */}
      <Modal
        open={!!reviewModalOb}
        onClose={() => setReviewModalOb(null)}
        title="Review Obligation"
        footer={
          <>
            <Button variant="destructive" onClick={() => submitReview('REJECTED')}>Reject</Button>
            <Button variant="outline" onClick={() => submitReview('EDITED')}>Save Edit</Button>
            <Button variant="primary" onClick={() => submitReview('APPROVED')}>Approve</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="edit-actor" className="mb-1 block text-xs font-medium text-muted-foreground">Actor</label>
            <Input
              id="edit-actor"
              value={editForm.actor}
              onChange={(e) => setEditForm({ ...editForm, actor: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="edit-action" className="mb-1 block text-xs font-medium text-muted-foreground">Action</label>
            <Textarea
              id="edit-action"
              rows={3}
              value={editForm.action}
              onChange={(e) => setEditForm({ ...editForm, action: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-condition" className="mb-1 block text-xs font-medium text-muted-foreground">Condition</label>
              <Input
                id="edit-condition"
                value={editForm.condition}
                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="edit-deadline" className="mb-1 block text-xs font-medium text-muted-foreground">Deadline</label>
              <Input
                id="edit-deadline"
                value={editForm.deadline}
                onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="edit-frequency" className="mb-1 block text-xs font-medium text-muted-foreground">Frequency</label>
              <Input
                id="edit-frequency"
                value={editForm.frequency}
                onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={editForm.is_mandatory}
                  onChange={(e) => setEditForm({ ...editForm, is_mandatory: e.target.checked })}
                  className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
                Mandatory
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-reviewer" className="mb-1 block text-xs font-medium text-muted-foreground">Reviewer</label>
              <Input
                id="edit-reviewer"
                placeholder="Optional"
                value={reviewReviewer}
                onChange={(e) => setReviewReviewer(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="edit-note" className="mb-1 block text-xs font-medium text-muted-foreground">Note</label>
              <Input
                id="edit-note"
                placeholder="Optional comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Review history drawer */}
      <Drawer
        open={!!historyOb}
        onClose={() => setHistoryOb(null)}
        title={
          <span className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Review History
          </span>
        }
      >
        {historyLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : historyReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {historyReviews.map((r) => (
              <div key={r.review_id} className="rounded-xl border border-border bg-background p-4">
                <div className="mb-1 flex items-center justify-between">
                  <StatusBadge tone={reviewActionTone(r.action)}>{r.action}</StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                {r.reviewer && <p className="text-sm text-foreground"><span className="text-muted-foreground">Reviewer: </span>{r.reviewer}</p>}
                {r.comment && <p className="mt-1 text-sm text-foreground">{r.comment}</p>}
                {Object.keys(r.changes || {}).length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Changed: {Object.keys(r.changes).join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </AppLayout>
  );
};
