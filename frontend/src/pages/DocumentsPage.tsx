import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Alert } from '../components/ui/alert';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/pagination';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { api } from '../lib/api';
import {
  FileText,
  BookOpen,
  ExternalLink,
  Calendar,
  User,
  File as FileIcon,
  ArrowRight,
  Trash2,
  Loader2,
} from 'lucide-react';

interface DocumentRecord {
  document_id: string;
  title?: string;
  document_type?: string;
  author?: string;
  page_count?: number;
  file_size?: number;
  language?: string;
  source?: string;
  publication_date?: string;
  upload_timestamp?: string;
  processing_status?: string;
  metadata?: {
    author?: string;
    page_count?: number;
    language?: string;
    document_type?: string;
    source?: string;
    publication_date?: string;
    creation_date?: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: 'Uploaded',
  PARSED: 'Parsed',
  CHUNKED: 'Chunked',
  EMBEDDED: 'Embedded',
  CLAUSES_CREATED: 'Clauses Created',
  EXTRACTING_OBLIGATIONS: 'Extracting',
  OBLIGATIONS_EXTRACTED: 'Ready',
  OBLIGATIONS_REVIEWED: 'Reviewed',
  GENERATING_TASKS: 'Generating Tasks',
  TASKS_CREATED: 'Tasks Created',
  TASKS_ASSIGNED: 'Tasks Assigned',
  EVIDENCE_SUBMITTED: 'Evidence Submitted',
  COMPLIANCE_EVALUATED: 'Evaluated',
  GAP_ANALYSIS_COMPLETED: 'Gap Analyzed',
  REPORT_GENERATED: 'Report Ready',
  FAILED: 'Failed',
  EXTRACTION_FAILED: 'Failed',
  PROCESSING_CANCELLED: 'Cancelled',
};

function formatSize(bytes?: number) {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PAGE_SIZE = 10;

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const data = await api.documents.list();
        setDocuments(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const doc = pendingDelete;
    setDeletingId(doc.document_id);
    setError(null);
    try {
      await api.documents.delete(doc.document_id);
      setDocuments(prev => prev.filter(d => d.document_id !== doc.document_id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = documents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Original regulatory documents stored in the library.
            </p>
          </div>
          <Link
            to="/pipeline"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Upload &amp; Process <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {error && (
          <Alert tone="destructive" role="alert" title="Something went wrong">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4" role="status" aria-live="polite">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
              <div
                className="absolute inset-2 rounded-full border-r-2 border-accent animate-spin"
                style={{ animationDirection: 'reverse' }}
              />
            </div>
            <p className="text-primary font-medium animate-pulse">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center border-2 border-dashed border-border rounded-2xl bg-muted/30 py-24">
            <FileText className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
            <p className="font-medium text-foreground">No documents in the library</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a document from the Pipeline page to start the compliance process.
            </p>
            <Link
              to="/pipeline"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Pipeline <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <caption className="sr-only">Stored regulatory documents and their processing status</caption>
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Author</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pages</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {pageItems.map(doc => {
                    const meta = doc.metadata ?? {};
                    const author = doc.author ?? meta.author;
                    const type = doc.document_type ?? meta.document_type;
                    const pages = doc.page_count ?? meta.page_count;
                    const date = doc.upload_timestamp ? new Date(doc.upload_timestamp).toLocaleDateString() : '—';
                    return (
                      <tr key={doc.document_id} className="transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <FileIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate text-sm font-medium text-foreground">
                                {doc.title ?? doc.document_id}
                              </p>
                              <p className="font-mono text-xs text-muted-foreground">{doc.document_id.slice(0, 12)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{type ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" /> {author ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{pages ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatSize(doc.file_size)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {date}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={doc.processing_status ?? ''}
                            label={STATUS_LABELS[doc.processing_status ?? ''] ?? doc.processing_status}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/documents/${doc.document_id}/clauses`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <BookOpen className="h-3.5 w-3.5" /> View Clauses
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Link>
                            <button
                              onClick={() => setPendingDelete(doc)}
                              disabled={deletingId === doc.document_id}
                              aria-label={`Delete ${doc.title ?? doc.document_id}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              {deletingId === doc.document_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4">
              <Pagination page={safePage} pageSize={PAGE_SIZE} total={documents.length} onPageChange={setPage} />
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        destructive
        title="Delete document?"
        description={pendingDelete ? `This permanently removes "${pendingDelete.title ?? pendingDelete.document_id}" and all its clauses, obligations and tasks. This cannot be undone.` : undefined}
        confirmLabel={deletingId ? 'Deleting…' : 'Delete'}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppLayout>
  );
};
