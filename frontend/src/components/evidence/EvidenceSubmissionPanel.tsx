import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import type { Task } from "@/data/taskMockData";

interface EvidenceSubmissionPanelProps {
  task: Task;
  onSubmit: (data: FormData) => Promise<void>;
}

export function EvidenceSubmissionPanel({ task, onSubmit }: EvidenceSubmissionPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null) => {
    setFile(f);
    setError(null);
    setSuccess(false);
  }, []);

  const handleSubmit = async () => {
    if (!file) {
      setError("Please choose an evidence file.");
      return;
    }
    setError(null);
    setSuccess(false);
    setIsUploading(true);
    try {
      const data = new FormData();
      data.append("task_id", task.id);
      data.append("document_id", task.document_id);
      data.append("obligation_id", task.obligation_id);
      data.append("description", description);
      data.append("submitted_by", submittedBy);
      data.append("file", file);
      await onSubmit(data);
      setSuccess(true);
      setFile(null);
      setDescription("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Failed to submit evidence.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {task.evidence_required.length > 0 && (
        <div>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Evidence Required
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {task.evidence_required.map((item: any) => (
              <li key={item} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:border-primary/50"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-sm text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            <span className="truncate max-w-[220px]">{file.name}</span>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleFile(null);
              }}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <UploadCloud className="w-8 h-8 text-muted-foreground/60" />
            <p className="text-sm">Drag & drop or click to upload evidence</p>
            <p className="text-xs">PDF, images, docs, spreadsheets, logs up to 25 MB</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Explanation (optional)
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="How does this evidence demonstrate compliance?"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Submitted By (optional)
          </label>
          <input
            value={submittedBy}
            onChange={e => setSubmittedBy(e.target.value)}
            placeholder="name@broker.com"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm text-green-600 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Evidence submitted successfully.
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={isUploading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4" />
            Submit Evidence
          </>
        )}
      </button>
    </div>
  );
}
