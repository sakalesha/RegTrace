import { useEffect, useMemo, useState } from "react";
import { ListTodo, XCircle, FileSpreadsheet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { GenerateTasksPanel } from "../components/tasks/GenerateTasksPanel";
import { TaskFilterBar, type TaskFilterValues } from "../components/tasks/TaskFilterBar";
import { TaskDetailPanel } from "../components/tasks/TaskDetailPanel";
import { TaskStatusBadge } from "../components/tasks/TaskStatusBadge";
import { useTasks } from "../hooks/useTasks";
import { api } from "../lib/api";
import type { Task } from "../data/taskMockData";

const initialFilters: TaskFilterValues = { status: "", department: "", priority: "", search: "" };

interface DocumentOption {
  document_id: string;
  title?: string;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ListTodo className="w-7 h-7 text-primary" />
              Task Management
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Operational compliance tasks generated from approved obligations.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={filteredTasks.length === 0}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 ${
              filteredTasks.length > 0
                ? 'border border-border bg-card text-foreground hover:bg-muted/80'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="space-y-6">
          <GenerateTasksPanel documents={documents} onGenerated={() => fetchTasks(undefined, false)} />

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              View tasks for document
            </label>
            <select
              value={selectedDocument}
              onChange={e => {
                setSelectedDocument(e.target.value);
                setActiveTaskId(null);
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
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedDocument
                ? <>Showing tasks for <span className="font-medium text-foreground">{documents.find(d => d.document_id === selectedDocument)?.title ?? selectedDocument}</span>.</>
                : "Select a document to narrow down to its compliance tasks, or leave on \"All documents\" to see everything."}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <TaskFilterBar
            values={filters}
            onChange={setFilters}
            onReset={() => setFilters(initialFilters)}
          />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: "reverse" }}></div>
              </div>
              <p className="text-indigo-500 font-medium animate-pulse">Loading compliance tasks...</p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="w-full lg:w-2/3 space-y-4">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                    <ListTodo className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      No tasks found. Generate tasks for an approved document to get started.
                    </p>
                  </div>
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
                  <div className="sticky top-8 p-6 rounded-xl border border-border bg-card h-[calc(100vh-6rem)] flex flex-col items-center justify-center text-center shadow-sm">
                    <ListTodo className="w-8 h-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Select a task to view its details, update status, or reassign the owning department.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function TaskRow({ task, isActive, onClick }: { task: Task; isActive: boolean; onClick: () => void }) {
  const priorityColor =
    task.priority === "Critical" ? "text-destructive" :
    task.priority === "High" ? "text-orange-500" :
    task.priority === "Medium" ? "text-blue-500" :
    "text-muted-foreground";

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border cursor-pointer transition-all duration-150 ${
        isActive ? "border-primary shadow-sm bg-card" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-xs font-semibold ${priorityColor}`}>{task.priority}</span>
        <TaskStatusBadge status={task.status} />
        {task.assigned_department && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{task.assigned_department}</span>
        )}
        {task.clause_reference && (
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Clause: {task.clause_reference}
          </span>
        )}
      </div>

      <p className="text-foreground font-medium leading-relaxed">{task.title}</p>
      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{task.description}</p>

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