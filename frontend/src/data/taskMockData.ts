export interface Task {
  [key: string]: any;
}

export const taskMockData: Task[] = [
  {
    id: "T-1001",
    title: "File quarterly compliance report",
    description: "Submit the SEBI quarterly compliance report.",
    department: "Compliance",
    status: "open",
    priority: "high",
    dueDate: "2026-09-30",
    assignee: "RegTrace",
  },
  {
    id: "T-1002",
    title: "Reconcile trade surveillance logs",
    description: "Reconcile daily trade surveillance exceptions.",
    department: "Surveillance",
    status: "in_progress",
    priority: "medium",
    dueDate: "2026-09-15",
    assignee: "Ops",
  },
];

export const departments: string[] = [
  "Compliance",
  "Surveillance",
  "Legal",
  "Operations",
  "Risk",
];

export const taskStatuses: string[] = [
  "open",
  "in_progress",
  "blocked",
  "done",
];

export const taskPriorities: string[] = [
  "low",
  "medium",
  "high",
  "critical",
];
