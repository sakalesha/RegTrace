import { useEffect, useState } from "react";
import { FileCheck } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { EvidenceList } from "../components/evidence/EvidenceList";
import { EvidenceSubmissionPanel } from "../components/evidence/EvidenceSubmissionPanel";
import { useEvidence } from "../hooks/useEvidence";
import { useTasks } from "../hooks/useTasks";
import { api } from "../lib/api";
import type { Task } from "../data/taskMockData";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/empty-state";

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
      <PageHeader
        title="Evidence Collection"
        description="Capture documentary proof of compliance for each task."
      />

      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <FileCheck className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="evidence-document" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Document
            </label>
            <Select
              id="evidence-document"
              value={selectedDocument}
              onChange={(e) => {
                setSelectedDocument(e.target.value);
                setSelectedTaskId("");
              }}
            >
              <option value="">All documents</option>
              {documents.map(doc => (
                <option key={doc.document_id} value={doc.document_id}>
                  {doc.title ?? doc.document_id}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="evidence-task" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Task
            </label>
            <Select
              id="evidence-task"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
            >
              <option value="">All tasks (grouped evidence)</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {selectedTask ? (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="w-full space-y-4 lg:w-1/2">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-1 text-base font-semibold">{selectedTask.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{selectedTask.description}</p>
              </div>
              <EvidenceSubmissionPanel task={selectedTask} onSubmit={handleSubmit} />
            </div>

            <div className="w-full lg:w-1/2">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Submitted Evidence
              </h3>
              <EvidenceList evidence={evidence} onUpdate={handleUpdate} />
            </div>
          </div>
        ) : (
          <div>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Submitted Evidence
            </h3>
            <EvidenceList evidence={evidence} onUpdate={handleUpdate} />
            {!selectedDocument && evidence.length === 0 && (
              <EmptyState
                icon={FileCheck}
                title="No evidence yet"
                description="Select a task to submit evidence, or choose a document to view all of its evidence."
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
