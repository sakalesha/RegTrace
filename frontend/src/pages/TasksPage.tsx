import { useEffect, useMemo, useState } from "react";
import { ListTodo, FileSpreadsheet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { GenerateTasksPanel } from "../components/tasks/GenerateTasksPanel";
import { TaskFilterBar, type TaskFilterValues } from "../components/tasks/TaskFilterBar";
import { TaskDetailPanel } from "../components/tasks/TaskDetailPanel";
import { TaskStatusBadge } from "../components/tasks/TaskStatusBadge";
import { useTasks } from "../hooks/useTasks";
import { api } from "../lib/api";
import { downloadCsv } from "../lib/csv";
import type { Task } from "../data/taskMockData";
import { PageHeader } from "../components/ui/page-header";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/empty-state";
import { PageLoading } from "../components/ui/spinner";

const initialFilters: TaskFilterValues = { status: "", department: "", priority: "", search: "" };

interface DocumentOption {
  document_id: string;
  title?: string;
}

export function TasksPage() {
  const { tasks, isLoading, fetchTasks, updateTask, assignTask } = useTasks();
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [filters, setFilters] = useState<TaskFilterValues>(initialFilters);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  useEffect(() => {
    fetchTasks(
      {
        document_id: selectedDocument || undefined,
        status: filters.status || undefined,
        department: filters.department || undefined,
        priority: filters.priority || undefined,
      },
      true
    );
  }, [selectedDocument, filters, fetchTasks]);

  const filteredTasks = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    if (!search) return tasks;
    return tasks.filter(t =>
      t.title.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search) ||
      (t.clause_reference ?? "").toLowerCase().includes(search)
    );
  }, [tasks, filters.search]);

  const activeTask = tasks.find(t => t.id === activeTaskId) ?? null;

  const handleStatusChange = async (taskId: string, status: string) => {
    setError(null);
    try {
      await updateTask(taskId, { status });
      await fetchTasks(undefined, false);
    } catch (err: any) {
      setError(err.message || "Failed to update task status.");
    }
  };

  const handleAssign = async (taskId: string, department: string) => {
    setError(null);
    try {
      await assignTask(taskId, department);
      await fetchTasks(undefined, false);
    } catch (err: any) {
      setError(err.message || "Failed to assign task.");
    }
  };

  const handleExportCsv = () => {
    downloadCsv(
      `tasks${selectedDocument ? `_${selectedDocument.slice(0, 8)}` : ''}.csv`,
      ['ID', 'Document ID', 'Obligation ID', 'Clause', 'Title', 'Description', 'Category', 'Priority', 'Due Rule', 'Recurrence', 'Recommended Owner', 'Assigned Department', 'Status'],
      filteredTasks.map(t => [
        t.id,
        t.document_id,
        t.obligation_id,
        t.clause_reference ?? t.clause_id ?? '',
        t.title,
        t.description,
        t.category,
        t.priority,
        t.due_rule ?? '',
        t.recurrence,
        t.recommended_owner ?? '',
        t.assigned_department ?? '',
        t.status,
      ])
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="Task Management"
        description="Operational compliance tasks generated from approved obligations."
        actions={
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredTasks.length === 0}
            aria-disabled={filteredTasks.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="space-y-6">
        <GenerateTasksPanel documents={documents} onGenerated={() => fetchTasks(undefined, false)} />

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <label htmlFor="task-document-filter" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            View tasks for document
          </label>
          <Select
            id="task-document-filter"
            value={selectedDocument}
            onChange={(e) => {
              setSelectedDocument(e.target.value);
              setActiveTaskId(null);
            }}
          >
            <option value="">All documents</option>
            {documents.map(doc => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.title ?? doc.document_id}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedDocument
              ? <>Showing tasks for <span className="font-medium text-foreground">{documents.find(d => d.document_id === selectedDocument)?.title ?? selectedDocument}</span>.</>
              : "Select a document to narrow down to its compliance tasks, or leave on \"All documents\" to see everything."}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <FileSpreadsheet className="h-4 w-4" />
            {error}
          </div>
        )}

        <TaskFilterBar
          values={filters}
          onChange={setFilters}
          onReset={() => setFilters(initialFilters)}
        />

        {isLoading ? (
          <PageLoading label="Loading compliance tasks..." />
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="w-full space-y-4 lg:w-2/3">
              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={ListTodo}
                  title="No tasks found"
                  description="Generate tasks for an approved document to get started."
                />
              ) : (
                filteredTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isActive={task.id === activeTaskId}
                    onClick={() => setActiveTaskId(task.id)}
                  />
                ))
              )}
            </div>

            <div className="w-full lg:w-1/3">
              {activeTask ? (
                <TaskDetailPanel
                  task={activeTask}
                  onStatusChange={handleStatusChange}
                  onAssign={handleAssign}
                />
              ) : (
                <div className="sticky top-8 flex h-[calc(100vh-6rem)] flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center shadow-sm">
                  <ListTodo className="mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Select a task to view its details, update status, or reassign the owning department.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function TaskRow({ task, isActive, onClick }: { task: Task; isActive: boolean; onClick: () => void }) {
  const priorityColor =
    task.priority === "Critical" ? "text-destructive" :
    task.priority === "High" ? "text-warning" :
    task.priority === "Medium" ? "text-accent" :
    "text-muted-foreground";

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-5 transition-all duration-150 ${
        isActive ? "border-primary bg-card shadow-sm" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold ${priorityColor}`}>{task.priority}</span>
        <TaskStatusBadge status={task.status} />
        {task.assigned_department && (
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{task.assigned_department}</span>
        )}
        {task.clause_reference && (
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            Clause: {task.clause_reference}
          </span>
        )}
      </div>

      <p className="font-medium leading-relaxed text-foreground">{task.title}</p>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider">Category</span>
          <span className="font-medium text-foreground">{task.category}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider">Recurrence</span>
          <span className="font-medium text-foreground">{task.recurrence}</span>
        </span>
        {task.due_rule && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider">Due</span>
            <span className="font-medium text-foreground">{task.due_rule}</span>
          </span>
        )}
      </div>
    </div>
  );
}
