import { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

interface DocumentOption {
  document_id: string;
  title?: string;
}

interface GenerateTasksPanelProps {
  documents: DocumentOption[];
  onGenerated: () => void;
}

export function GenerateTasksPanel({ documents, onGenerated }: GenerateTasksPanelProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedDocumentId) return;
    setIsGenerating(true);
    setFeedback(null);
    try {
      await api.tasks.generate(selectedDocumentId);
      setFeedback("Task generation started in the background. Refresh shortly to see results.");
      onGenerated();
    } catch (err: any) {
      setFeedback(err.message || "Failed to start task generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex-1 min-w-[220px]">
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Document
        </label>
        <select
          value={selectedDocumentId}
          onChange={e => setSelectedDocumentId(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a document...</option>
          {documents.map(doc => (
            <option key={doc.document_id} value={doc.document_id}>
              {doc.title ?? doc.document_id}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!selectedDocumentId || isGenerating}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {isGenerating ? "Starting..." : "Generate Tasks"}
      </button>

      {feedback && <p className="text-xs text-muted-foreground basis-full mt-1">{feedback}</p>}
    </div>
  );
}