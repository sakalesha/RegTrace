import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
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

const PROCESSING = new Set([
  'UPLOADED', 'PARSED', 'CHUNKED', 'EMBEDDED', 'CLAUSES_CREATED',
  'EXTRACTING_OBLIGATIONS', 'GENERATING_TASKS',
]);

const FAILED = new Set(['FAILED', 'EXTRACTION_FAILED', 'TASKS_GENERATION_FAILED']);

const DONE = new Set([
  'OBLIGATIONS_EXTRACTED', 'OBLIGATIONS_REVIEWED', 'TASKS_CREATED',
  'TASKS_ASSIGNED', 'EVIDENCE_SUBMITTED', 'COMPLIANCE_EVALUATED',
  'GAP_ANALYSIS_COMPLETED', 'REPORT_GENERATED',
]);

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  if (FAILED.has(status)) {
    return <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500 border border-red-500/30">Failed</span>;
  }
  if (PROCESSING.has(status)) {
    return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500 border border-amber-500/30">Processing</span>;
  }
  if (DONE.has(status)) {
    return <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500 border border-green-500/30">Ready</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border">{status}</span>;
}

function formatSize(bytes?: number) {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (doc: DocumentRecord) => {
    if (!window.confirm(
      `Delete "${doc.title ?? doc.document_id}"?\n\n` +
      'This permanently removes the document and all its clauses, obligations and tasks. This cannot be undone.'
    )) return;

    setDeletingId(doc.document_id);
    setError(null);
    try {
      await api.documents.delete(doc.document_id);
      setDocuments(prev => prev.filter(d => d.document_id !== doc.document_id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Documents</h1>
            <p className="mt-2 text-sm text-gray-400">
              Original regulatory documents stored in the library.
            </p>
          </div>
          <Link
            to="/pipeline"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            Upload &amp; Process <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
            </div>
            <p className="text-indigo-500 font-medium animate-pulse">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <FileText className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No documents in the library</p>
            <p className="mt-1 text-sm text-gray-400">
              Upload a document from the Pipeline page to start the compliance process.
            </p>
            <Link
              to="/pipeline"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to Pipeline <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Author</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pages</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploaded</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {documents.map(doc => {
                    const meta = doc.metadata ?? {};
                    const author = doc.author ?? meta.author;
                    const type = doc.document_type ?? meta.document_type;
                    const pages = doc.page_count ?? meta.page_count;
                    const date = doc.upload_timestamp ? new Date(doc.upload_timestamp).toLocaleDateString() : '—';
                    return (
                      <tr key={doc.document_id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <FileIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate max-w-[240px]">
                                {doc.title ?? doc.document_id}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">{doc.document_id.slice(0, 12)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{type ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> {author ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{pages ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatSize(doc.file_size)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> {date}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={doc.processing_status} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/documents/${doc.document_id}/clauses`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                            >
                              <BookOpen className="w-3.5 h-3.5" /> View Clauses
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            </Link>
                            <button
                              onClick={() => handleDelete(doc)}
                              disabled={deletingId === doc.document_id}
                              title="Delete document"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                            >
                              {deletingId === doc.document_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};