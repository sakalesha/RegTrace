import { FileText, Download, ShieldCheck, ShieldX } from "lucide-react";
import { EvidenceStatusBadge } from "./EvidenceStatusBadge";
import { api } from "@/lib/api";
import type { Evidence } from "@/data/evidenceMockData";

interface EvidenceListProps {
  evidence: Evidence[];
  onUpdate: (evidenceId: string, data: any) => Promise<void>;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceList({ evidence, onUpdate }: EvidenceListProps) {
  if (evidence.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl">
        <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No evidence submitted for this task yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {evidence.map(item => (
        <div key={item.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.file_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : ""}
                  {item.file_size ? ` · ${formatBytes(item.file_size)}` : ""}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.description}</p>
                )}
                {item.submitted_by && (
                  <p className="text-xs text-muted-foreground mt-1">by {item.submitted_by}</p>
                )}
                {item.clause_reference && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    Clause: {item.clause_reference} {item.page_number ? `(p. ${item.page_number})` : ""}
                  </p>
                )}
              </div>
            </div>
            <EvidenceStatusBadge status={item.status} />
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
            <a
              href={api.evidence.fileUrl(item.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download className="w-3.5 h-3.5" />
              View
            </a>
            {item.status === "SUBMITTED" && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <button
                  onClick={() => onUpdate(item.id, { status: "ACCEPTED" })}
                  className="inline-flex items-center gap-1.5 text-xs text-green-600 hover:underline"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Accept
                </button>
                <button
                  onClick={() => onUpdate(item.id, { status: "REJECTED" })}
                  className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline"
                >
                  <ShieldX className="w-3.5 h-3.5" />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
