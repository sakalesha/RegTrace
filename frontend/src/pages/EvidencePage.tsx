import { useEffect, useState } from "react";
import { FileCheck, XCircle } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { EvidenceList } from "../components/evidence/EvidenceList";
import { EvidenceSubmissionPanel } from "../components/evidence/EvidenceSubmissionPanel";
import { useEvidence } from "../hooks/useEvidence";
import { useTasks } from "../hooks/useTasks";
import { api } from "../lib/api";
import type { Task } from "../data/taskMockData";

interface DocumentOption {
  document_id: string;
  title?: string;
}

export function EvidencePage() {
  const { evidence, fetchByTask, fetchByDocument, submit, update } = useEvidence();
  const { tasks, fetchTasks } = useTasks();
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  useEffect(() => {
    if (selectedDocument) {
      fetchTasks({ document_id: selectedDocument }, true);
    } else {
      fetchTasks(undefined, true);
    }
  }, [selectedDocument, fetchTasks]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchByTask(selectedTaskId, true);
    } else if (selectedDocument) {
      fetchByDocument(selectedDocument, true);
    } else {
      fetchByDocument("", false);
    }
  }, [selectedTaskId, selectedDocument, fetchByTask, fetchByDocument]);

  const selectedTask: Task | null = tasks.find(t => t.id === selectedTaskId) ?? null;

  const handleSubmit = async (data: FormData) => {
    setError(null);
    try {
      await submit(data);
      if (selectedTaskId) await fetchByTask(selectedTaskId, false);
    } catch (err: any) {
      setError(err.message || "Failed to submit evidence.");
    }
  };

  const handleUpdate = async (evidenceId: string, data: any) => {
    setError(null);
    try {
      await update(evidenceId, data);
      if (selectedTaskId) await fetchByTask(selectedTaskId, false);
    } catch (err: any) {
      setError(err.message || "Failed to update evidence.");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-primary" />
            Evidence Collection
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Capture documentary proof of compliance for each task.
          </p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Document
              </label>
              <select
                value={selectedDocument}
                onChange={e => {
                  setSelectedDocument(e.target.value);
                  setSelectedTaskId("");
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All documents</option>
                {documents.map(doc => (
                  <option key={doc.document_id} value={doc.document_id}>
                    {doc.title ?? doc.document_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Task
              </label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All tasks (grouped evidence)</option>
                {tasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTask ? (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-1/2 space-y-4">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-base font-semibold mb-1">{selectedTask.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedTask.description}</p>
                </div>
                <EvidenceSubmissionPanel task={selectedTask} onSubmit={handleSubmit} />
              </div>

              <div className="w-full lg:w-1/2">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                  Submitted Evidence
                </h3>
                <EvidenceList evidence={evidence} onUpdate={handleUpdate} />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Submitted Evidence
              </h3>
              <EvidenceList evidence={evidence} onUpdate={handleUpdate} />
              {!selectedDocument && evidence.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                  <FileCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Select a task to submit evidence, or choose a document to view all of its evidence.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
