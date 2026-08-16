import { FilterX, Search } from "lucide-react";
import { departments, taskStatuses, taskPriorities } from "@/data/taskMockData";

export interface TaskFilterValues {
  status: string;
  department: string;
  priority: string;
  search: string;
}

interface TaskFilterBarProps {
  values: TaskFilterValues;
  onChange: (values: TaskFilterValues) => void;
  onReset: () => void;
}

const selectClass =
  "w-full sm:w-40 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

export function TaskFilterBar({ values, onChange, onReset }: TaskFilterBarProps) {
  const set = (key: keyof TaskFilterValues, value: string) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 sm:flex-initial sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={values.search}
          onChange={e => set("search", e.target.value)}
          placeholder="Search tasks..."
          className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <select
        className={selectClass}
        value={values.status}
        onChange={e => set("status", e.target.value)}
      >
        <option value="">All Statuses</option>
        {taskStatuses.map(s => (
          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={values.department}
        onChange={e => set("department", e.target.value)}
      >
        <option value="">All Departments</option>
        {departments.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={values.priority}
        onChange={e => set("priority", e.target.value)}
      >
        <option value="">All Priorities</option>
        {taskPriorities.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <FilterX className="w-4 h-4" />
        Reset
      </button>
    </div>
  );
}