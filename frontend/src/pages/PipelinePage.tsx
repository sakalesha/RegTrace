import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { api } from '../lib/api';
import { anyDocumentProcessing } from '../lib/pipelineStatus';
import { UploadDropzone } from '../components/documents/UploadDropzone';
import { SelectedFileCard } from '../components/documents/SelectedFileCard';
import { MetadataForm, type DocumentUploadFormValues } from '../components/documents/MetadataForm';
import { ValidationPanel } from '../components/documents/ValidationPanel';
import {
  Loader2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Clock,
  Upload,
  ArrowRight,
  ChevronDown,
  X,
  FileText,
  Layers,
  User,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/ui/page-header';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/empty-state';
import { PageLoading } from '../components/ui/spinner';

interface PipelineCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  assigned: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

interface PipelineDocument {
  document_id: string;
  title?: string;
  processing_status: string;
  upload_timestamp?: string;
  document_type?: string;
  author?: string;
  page_count?: number;
  file_size?: number;
  language?: string;
  source?: string;
  publication_date?: string;
  clause_count?: number;
  obligation_clause_count?: number;
  clauses_processed?: number;
  tasks_processed?: number;
  obligations: PipelineCounts;
  tasks: PipelineCounts;
}

interface Stage {
  key: string;
  label: string;
  statuses: string[];
  failureStatuses?: string[];
}

const STAGES: Stage[] = [
  { key: 'upload', label: 'Upload', statuses: ['UPLOADED'] },
  { key: 'parse', label: 'Parse', statuses: ['PARSED'] },
  { key: 'chunk', label: 'Chunk', statuses: ['CHUNKED'] },
  { key: 'embed', label: 'Embed', statuses: ['EMBEDDED'] },
  { key: 'clauses', label: 'Clauses', statuses: ['CLAUSES_CREATED'] },
  {
    key: 'extract',
    label: 'Extract Obligations',
    statuses: [
      'EXTRACTING_OBLIGATIONS', 'OBLIGATIONS_EXTRACTED', 'OBLIGATIONS_REVIEWED',
      'GENERATING_TASKS', 'TASKS_GENERATION_FAILED', 'TASKS_CREATED', 'TASKS_ASSIGNED',
      'EVIDENCE_SUBMITTED', 'COMPLIANCE_EVALUATED', 'GAP_ANALYSIS_COMPLETED', 'REPORT_GENERATED',
    ],
    failureStatuses: ['EXTRACTION_FAILED'],
  },
  {
    key: 'review',
    label: 'Review Obligations',
    statuses: [
      'OBLIGATIONS_REVIEWED', 'GENERATING_TASKS', 'TASKS_GENERATION_FAILED',
      'TASKS_CREATED', 'TASKS_ASSIGNED', 'EVIDENCE_SUBMITTED',
      'COMPLIANCE_EVALUATED', 'GAP_ANALYSIS_COMPLETED', 'REPORT_GENERATED',
    ],
  },
  {
    key: 'tasks',
    label: 'Generate Tasks',
    statuses: [
      'GENERATING_TASKS', 'TASKS_CREATED', 'TASKS_ASSIGNED',
      'EVIDENCE_SUBMITTED', 'COMPLIANCE_EVALUATED', 'GAP_ANALYSIS_COMPLETED', 'REPORT_GENERATED',
    ],
    failureStatuses: ['TASKS_GENERATION_FAILED'],
  },
  {
    key: 'evidence',
    label: 'Evidence & Compliance',
    statuses: ['EVIDENCE_SUBMITTED', 'COMPLIANCE_EVALUATED', 'GAP_ANALYSIS_COMPLETED', 'REPORT_GENERATED'],
  },
];

  const PROCESSING_STATUSES = new Set([
    'UPLOADED', 'PARSED', 'CHUNKED', 'EMBEDDED', 'CLAUSES_CREATED',
    'EXTRACTING_OBLIGATIONS', 'GENERATING_TASKS',
  ]);

  const EXTRACTION_NOT_DONE = new Set([
    'UPLOADED', 'PARSED', 'CHUNKED', 'EMBEDDED', 'CLAUSES_CREATED',
    'EXTRACTING_OBLIGATIONS', 'EXTRACTION_FAILED', 'PROCESSING_CANCELLED',
  ]);

  const CANCELLABLE_STATUSES = new Set([
    'EXTRACTING_OBLIGATIONS', 'GENERATING_TASKS',
  ]);

type StageState = 'done' | 'active' | 'pending' | 'failed';

function formatSize(bytes?: number) {
  if (bytes === undefined || bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PipelinePage = () => {
  const [documents, setDocuments] = useState<PipelineDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload panel state
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMetadataValid, setIsMetadataValid] = useState(false);
  const [completedFieldsCount, setCompletedFieldsCount] = useState(0);
  const [totalFieldsCount, setTotalFieldsCount] = useState(7);

  // Expanded details
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const anyProcessing = anyDocumentProcessing(documents);

  const fetchOverview = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await api.pipeline.getOverview();
      setDocuments(data.documents);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load pipeline');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!anyProcessing) return;
    const intervalId = setInterval(() => fetchOverview(false), 5000);
    return () => clearInterval(intervalId);
  }, [anyProcessing, fetchOverview]);

  const handleFileSelected = (selectedFile: File) => setFile(selectedFile);
  const handleRemoveFile = () => setFile(null);
  const handleValidityChange = (isValid: boolean, completed: number, total: number) => {
    setIsMetadataValid(isValid);
    setCompletedFieldsCount(completed);
    setTotalFieldsCount(total);
  };

  const handleStartProcessing = async (data: DocumentUploadFormValues) => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      const result = await api.documents.upload(formData);
      setSuccess(`"${result.title ?? file.name}" uploaded — processing started.`);
      setFile(null);
      setShowUpload(false);
      fetchOverview(false);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document. Check that the backend is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFormSubmit = () => {
    const formElement = document.getElementById('metadata-form') as HTMLFormElement;
    if (formElement) {
      formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const getCurrentIndex = (doc: PipelineDocument): number => {
    const status = doc.processing_status;
    for (let i = STAGES.length - 1; i >= 0; i--) {
      if (STAGES[i].statuses.includes(status)) return i;
    }
    return -1;
  };

  const getEffectiveIndex = (doc: PipelineDocument): number => {
    let idx = getCurrentIndex(doc);
    const reviewIdx = STAGES.findIndex(s => s.key === 'review');
    const tasksIdx = STAGES.findIndex(s => s.key === 'tasks');

    if (doc.obligations.total > 0 && doc.obligations.pending > 0) {
      idx = Math.max(idx, reviewIdx);
    }
    if (doc.tasks.total > 0) {
      idx = Math.max(idx, tasksIdx);
    }
    return idx;
  };

  const getStageState = (doc: PipelineDocument, stage: Stage): StageState => {
    if (stage.failureStatuses?.includes(doc.processing_status)) return 'failed';

    const idx = getEffectiveIndex(doc);
    const stageIdx = STAGES.findIndex(s => s.key === stage.key);
    if (stageIdx < idx) return 'done';
    if (stageIdx === idx) return 'active';
    return 'pending';
  };

  const isProcessing = (doc: PipelineDocument) => PROCESSING_STATUSES.has(doc.processing_status);
  const isFailed = (doc: PipelineDocument) =>
    doc.processing_status === 'FAILED' ||
    doc.processing_status === 'EXTRACTION_FAILED' ||
    doc.processing_status === 'TASKS_GENERATION_FAILED';

  const handleStartExtraction = async (doc: PipelineDocument) => {
    setBusyDocId(doc.document_id);
    setError(null);
    setSuccess(null);
    try {
      await api.obligations.extract(doc.document_id);
      await new Promise(r => setTimeout(r, 1000));
    } catch (err: any) {
      setError(err.message || 'Failed to start extraction');
    } finally {
      setBusyDocId(null);
      fetchOverview(false);
    }
  };

  const handleGenerateTasks = async (doc: PipelineDocument) => {
    setBusyDocId(doc.document_id);
    setError(null);
    setSuccess(null);
    try {
      await api.tasks.generate(doc.document_id);
      await new Promise(r => setTimeout(r, 1000));
    } catch (err: any) {
      setError(err.message || 'Failed to start task generation');
    } finally {
      setBusyDocId(null);
      fetchOverview(false);
    }
  };

  const handleReRun = async (doc: PipelineDocument) => {
    if (!window.confirm(
      `Re-run processing for "${doc.title ?? doc.document_id}"?\n\n` +
      'This re-segments clauses and re-extracts obligations, refreshing their counts. Existing clauses and obligations will be replaced.'
    )) return;

    setBusyDocId(doc.document_id);
    setError(null);
    setSuccess(null);
    try {
      await api.clauses.segment(doc.document_id);
      await api.obligations.extract(doc.document_id);
      await new Promise(r => setTimeout(r, 1000));
      setSuccess(`Processing re-run started for "${doc.title ?? doc.document_id}".`);
    } catch (err: any) {
      setError(err.message || 'Failed to re-run processing');
    } finally {
      setBusyDocId(null);
      fetchOverview(false);
    }
  };

  const handleCancel = async (doc: PipelineDocument) => {
    if (!window.confirm(
      `Cancel the running pipeline for "${doc.title ?? doc.document_id}"?\n\n` +
      'Obligation extraction / task generation will be stopped. You can re-run it later.'
    )) return;

    setBusyDocId(doc.document_id);
    setError(null);
    setSuccess(null);
    try {
      await api.pipeline.cancel(doc.document_id);
      setSuccess(`Pipeline run cancelled for "${doc.title ?? doc.document_id}".`);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel pipeline run');
    } finally {
      setBusyDocId(null);
      fetchOverview(false);
    }
  };

  const handleDelete = async (doc: PipelineDocument) => {
    if (!window.confirm(
      `Delete "${doc.title ?? doc.document_id}"?\n\n` +
      'This permanently removes the document and all its clauses, obligations and tasks. This cannot be undone.'
    )) return;

    setBusyDocId(doc.document_id);
    setError(null);
    setSuccess(null);
    try {
      await api.documents.delete(doc.document_id);
      setSuccess(`Document "${doc.title ?? doc.document_id}" deleted.`);
      setExpandedDocId(null);
      fetchOverview(false);
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setBusyDocId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PROCESSING_CANCELLED') {
      return <StatusBadge tone="neutral" icon={false}>Cancelled</StatusBadge>;
    }
    if (status === 'FAILED' || status === 'EXTRACTION_FAILED' || status === 'TASKS_GENERATION_FAILED') {
      return <StatusBadge tone="destructive">Failed</StatusBadge>;
    }
    if (PROCESSING_STATUSES.has(status)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Processing
        </span>
      );
    }
    if (status === 'OBLIGATIONS_EXTRACTED') {
      return <StatusBadge tone="info" icon={false}>Obligations Ready</StatusBadge>;
    }
    if (status === 'OBLIGATIONS_REVIEWED') {
      return <StatusBadge tone="success">Obligations Reviewed</StatusBadge>;
    }
    if (['TASKS_CREATED', 'TASKS_ASSIGNED'].includes(status)) {
      return <StatusBadge tone="success">Tasks Ready</StatusBadge>;
    }
    if (['EVIDENCE_SUBMITTED', 'COMPLIANCE_EVALUATED', 'GAP_ANALYSIS_COMPLETED', 'REPORT_GENERATED'].includes(status)) {
      return <StatusBadge tone="success" icon={false}>Advanced</StatusBadge>;
    }
    return <StatusBadge tone="neutral">{status}</StatusBadge>;
  };

  const renderActions = (doc: PipelineDocument) => {
    const status = doc.processing_status;
    const busy = busyDocId === doc.document_id;
    const buttons: React.ReactNode[] = [];

    if (EXTRACTION_NOT_DONE.has(status)) {
      buttons.push(
        <button
          key="extract"
          onClick={() => handleStartExtraction(doc)}
          disabled={busy || status === 'EXTRACTING_OBLIGATIONS'}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {status === 'EXTRACTING_OBLIGATIONS' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
            status === 'EXTRACTION_FAILED' ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {status === 'EXTRACTING_OBLIGATIONS' ? 'Extracting...' : status === 'EXTRACTION_FAILED' ? 'Retry Extraction' : 'Start Extraction'}
        </button>
      );
    }

    if (CANCELLABLE_STATUSES.has(status)) {
      buttons.push(
        <button
          key="cancel"
          onClick={() => handleCancel(doc)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Cancel Run
        </button>
      );
    }

    if (doc.obligations.total > 0) {
      if (doc.obligations.pending > 0) {
        buttons.push(
          <Link
            key="review"
            to="/obligations"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
          >
            <Clock className="h-3.5 w-3.5" /> Review {doc.obligations.pending} pending
          </Link>
        );
      } else {
        buttons.push(
          <span key="reviewed" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-success/10 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Reviewed
          </span>
        );
      }
    }

    if (doc.tasks.total > 0) {
      buttons.push(
        <Link
          key="tasks"
          to="/tasks"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5" /> View {doc.tasks.total} tasks
        </Link>
      );
    } else if (status === 'TASKS_GENERATION_FAILED') {
      buttons.push(
        <button
          key="gen-tasks"
          onClick={() => handleGenerateTasks(doc)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry Task Generation
        </button>
      );
    } else if (status === 'GENERATING_TASKS') {
      buttons.push(
        <button key="gen-tasks" disabled className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/50 text-primary-foreground cursor-not-allowed">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating tasks...
        </button>
      );
    } else if (doc.obligations.total > 0 && doc.obligations.pending === 0 && status !== 'PROCESSING_CANCELLED') {
      buttons.push(
        <button
          key="gen-tasks"
          onClick={() => handleGenerateTasks(doc)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Generate Tasks
        </button>
      );
    }

    buttons.push(
      <button
        key="rerun"
        onClick={() => handleReRun(doc)}
        disabled={busy}
        title="Re-run clause segmentation and obligation extraction to refresh counts"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Re-run Processing
      </button>
    );

    buttons.push(
      <button
        key="delete"
        onClick={() => handleDelete(doc)}
        disabled={busy}
        title="Delete document and all related data"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
      </button>
    );

    return buttons;
  };

  const renderStageTrack = (doc: PipelineDocument) => (
    <div className="flex items-center overflow-x-auto pb-1 -mb-1">
      {STAGES.map((stage, i) => {
        const state = getStageState(doc, stage);
        const processing = isProcessing(doc);
        const showSpinner = state === 'active' && processing && stage.key !== 'review';

        const dotClass =
          state === 'done' ? 'bg-success border-success text-white' :
          state === 'failed' ? 'bg-destructive border-destructive text-white' :
          state === 'active' ? 'bg-primary border-primary text-primary-foreground' :
          'bg-muted border-border text-muted-foreground';

        const labelClass =
          state === 'done' ? 'text-success' :
          state === 'failed' ? 'text-destructive' :
          state === 'active' ? 'text-primary font-semibold' :
          'text-muted-foreground';

        return (
          <div key={stage.key} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1.5 w-16">
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${dotClass}`}>
                {showSpinner ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : state === 'done' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : state === 'failed' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>
              <span className={`text-[10px] leading-tight text-center ${labelClass}`}>{stage.label}</span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`w-6 h-0.5 shrink-0 mb-5 ${state === 'done' ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderDetails = (doc: PipelineDocument) => (
    <div className="mt-4 grid grid-cols-1 pt-4 border-t border-border sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Document Details</p>
        <DetailRow icon={FileText} label="Type" value={doc.document_type ?? '—'} />
        <DetailRow icon={User} label="Author" value={doc.author ?? '—'} />
        <DetailRow icon={Layers} label="Pages" value={doc.page_count != null ? String(doc.page_count) : '—'} />
        <DetailRow icon={FileText} label="Size" value={formatSize(doc.file_size)} />
        <DetailRow icon={FileText} label="Language" value={doc.language ?? '—'} />
        <DetailRow icon={FileText} label="Source" value={doc.source ?? '—'} />
        {doc.publication_date && (
          <DetailRow icon={Clock} label="Published" value={doc.publication_date} />
        )}
        {doc.upload_timestamp && (
          <DetailRow icon={Clock} label="Uploaded" value={new Date(doc.upload_timestamp).toLocaleString()} />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pipeline Outputs</p>
        <DetailRow icon={BookOpen} label="Clauses" value={doc.clause_count != null ? String(doc.clause_count) : '—'} />
        <DetailRow icon={FileText} label="Obligations" value={String(doc.obligations.total)} />
        <DetailRow icon={CheckCircle2} label="Approved" value={String(doc.obligations.approved)} />
        <DetailRow icon={Clock} label="Pending Review" value={String(doc.obligations.pending)} />
        <DetailRow icon={AlertTriangle} label="Rejected" value={String(doc.obligations.rejected)} />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tasks</p>
        <DetailRow icon={FileText} label="Total" value={String(doc.tasks.total)} />
        <DetailRow icon={Clock} label="Pending" value={String(doc.tasks.pending)} />
        <DetailRow icon={Clock} label="Assigned" value={String(doc.tasks.assigned)} />
        <DetailRow icon={Clock} label="In Progress" value={String(doc.tasks.in_progress)} />
        <DetailRow icon={CheckCircle2} label="Completed" value={String(doc.tasks.completed)} />
        <DetailRow icon={AlertTriangle} label="Overdue" value={String(doc.tasks.overdue)} />
      </div>

      <div className="flex items-end">
        <Link
          to={`/documents/${doc.document_id}/clauses`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" /> View Clauses
        </Link>
      </div>
    </div>
  );

  const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="text-xs font-medium text-foreground truncate">{value}</span>
    </div>
  );

  return (
    <AppLayout>
      <PageHeader
        title="Processing Pipeline"
        description="Upload documents, track every stage, and trigger manual steps without leaving this page."
        actions={
          <Button variant="primary" onClick={() => setShowUpload(v => !v)}>
            {showUpload ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {showUpload ? 'Close Upload' : 'Upload Document'}
          </Button>
        }
      />

      {showUpload && (
        <div className="mb-8 rounded-xl border border-border bg-card shadow-sm">
          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div>
                <p className="mb-1 text-lg font-semibold text-foreground">1. Document File</p>
                <p className="mb-3 text-sm text-muted-foreground">Upload a single regulatory document for processing</p>
                {!file ? (
                  <UploadDropzone onFileSelected={handleFileSelected} />
                ) : (
                  <SelectedFileCard file={file} onRemove={handleRemoveFile} />
                )}
              </div>
              <div>
                <p className="mb-1 text-lg font-semibold text-foreground">2. Document Metadata</p>
                <p className="mb-3 text-sm text-muted-foreground">Provide details required for the compliance pipeline</p>
                <MetadataForm
                  initialValues={{ title: file?.name.split('.').slice(0, -1).join('.') || '' }}
                  onValidityChange={handleValidityChange}
                  onSubmit={handleStartProcessing}
                />
              </div>
            </div>
            <div className="space-y-4">
              <ValidationPanel
                file={file}
                isMetadataValid={isMetadataValid}
                completedFieldsCount={completedFieldsCount}
                totalFieldsCount={totalFieldsCount}
              />
              <button
                onClick={triggerFormSubmit}
                disabled={!file || !isMetadataValid || isUploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? 'Processing...' : 'Start Processing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          {success}
        </div>
      )}

      {loading ? (
        <PageLoading label="Loading pipeline..." />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No documents in the pipeline yet"
          description='Use the "Upload Document" button above to start the compliance process.'
        />
      ) : (
        <div className="space-y-6">
          {documents.map(doc => {
            const failed = isFailed(doc);
            const date = doc.upload_timestamp ? new Date(doc.upload_timestamp).toLocaleDateString() : '';
            const actions = renderActions(doc);
            const expanded = expandedDocId === doc.document_id;

            return (
              <div
                key={doc.document_id}
                className={`rounded-xl border bg-card p-5 shadow-sm transition-all ${
                  failed ? 'border-destructive/40' : isProcessing(doc) ? 'border-primary/40' : 'border-border'
                }`}
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-foreground">{doc.title ?? doc.document_id}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {date ? `${date} · ` : ''}
                      <span className="font-mono">{doc.document_id.slice(0, 8)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {doc.obligations.total} obligations
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" /> {doc.obligations.approved} approved
                      </span>
                      {doc.tasks.total > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {doc.tasks.total} tasks
                        </span>
                      )}
                    </div>
                    {getStatusBadge(doc.processing_status)}
                    <button
                      onClick={() => setExpandedDocId(expanded ? null : doc.document_id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                      title={expanded ? 'Hide details' : 'Show details'}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {doc.processing_status === 'FAILED' && (
                  <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    This document's processing failed. Re-upload it to start over.
                  </div>
                )}

                <div className="rounded-lg border border-border bg-background/60 p-4">
                  {renderStageTrack(doc)}
                </div>

                {doc.processing_status === 'EXTRACTING_OBLIGATIONS' && (
                  <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        Extracting obligations…
                      </span>
                      <span className="font-semibold text-primary">
                        {doc.clauses_processed ?? 0} <span className="font-normal text-muted-foreground">of</span> {doc.obligation_clause_count ?? '—'} clauses
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: doc.obligation_clause_count ? `${Math.min(100, ((doc.clauses_processed ?? 0) / doc.obligation_clause_count) * 100)}%` : '4%',
                        }}
                      />
                    </div>
                  </div>
                )}

                {doc.processing_status === 'GENERATING_TASKS' && (
                  <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                        Generating tasks…
                      </span>
                      <span className="font-semibold text-accent">
                        {doc.tasks_processed ?? 0} <span className="font-normal text-muted-foreground">of</span> {doc.obligations.total ?? '—'} obligations
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{
                          width: doc.obligations.total ? `${Math.min(100, ((doc.tasks_processed ?? 0) / doc.obligations.total) * 100)}%` : '4%',
                        }}
                      />
                    </div>
                  </div>
                )}

                {expanded && renderDetails(doc)}

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  {actions.length > 0 ? actions : (
                    <span className="text-xs text-muted-foreground">Awaiting processing...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};
