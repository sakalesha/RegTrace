import { AlertCircle, Building2, CalendarClock, ClipboardList, FileCheck } from "lucide-react";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { departments, taskStatuses } from "@/data/taskMockData";
import type { Task } from "@/data/taskMockData";

interface TaskDetailPanelProps {
  task: Task;
  onStatusChange: (taskId: string, status: string) => void;
  onAssign: (taskId: string, department: string) => void;
}

const selectClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export function TaskDetailPanel({ task, onStatusChange, onAssign }: TaskDetailPanelProps) {
  return (
    <div className="sticky top-8 p-6 rounded-xl border border-border bg-card h-[calc(100vh-6rem)] overflow-y-auto shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold">Task Detail</h3>
        <TaskStatusBadge status={task.status} />
      </div>

      <div className="space-y-5">
        <div>
          <h4 className="text-base font-semibold leading-snug">{task.title}</h4>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{task.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Category</span>
            <span className="font-medium text-foreground">{task.category}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Priority</span>
            <span className="font-medium text-foreground">{task.priority}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Recurrence</span>
            <span className="font-medium text-foreground">{task.recurrence}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Due Rule</span>
            <span className="font-medium text-foreground">{task.due_rule ?? "—"}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <FileCheck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Evidence Required</span>
            {task.evidence_required.length > 0 ? (
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {task.evidence_required.map((item: any) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">None specified</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <ClipboardList className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Regulatory Reference</span>
            <span className="text-foreground">
              {task.clause_reference ?? "—"} {task.page_number ? `(p. ${task.page_number})` : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Assigned Department</span>
            <span className="text-foreground">{task.assigned_department ?? "Not assigned"}</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Update Status
            </label>
            <select
              value={task.status}
              onChange={e => onStatusChange(task.id, e.target.value)}
              className={selectClass}
            >
              {taskStatuses.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              Assign Department
            </label>
            <select
              value={task.assigned_department ?? ""}
              onChange={e => e.target.value && onAssign(task.id, e.target.value)}
              className={selectClass}
            >
              <option value="">Select department...</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}