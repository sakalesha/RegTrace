import {
  LayoutDashboard,
  Workflow,
  FileText,
  BookOpen,
  CheckSquare,
  ListTodo,
  FileCheck,
  ShieldCheck,
  LineChart,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const primaryNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
];

export const navGroups: NavGroup[] = [
  {
    title: "Ingest",
    items: [
      { name: "Pipeline", href: "/pipeline", icon: Workflow },
      { name: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    title: "Analyze",
    items: [
      { name: "Clauses", href: "/clauses", icon: BookOpen },
      { name: "Obligations", href: "/obligations", icon: CheckSquare },
      { name: "Tasks", href: "/tasks", icon: ListTodo },
      { name: "Evidence", href: "/evidence", icon: FileCheck },
    ],
  },
  {
    title: "Assurance",
    items: [
      { name: "Compliance", href: "/compliance", icon: ShieldCheck },
      { name: "Gap Analysis", href: "/gap-analysis", icon: LineChart },
      { name: "Audit Reports", href: "/reports", icon: ClipboardList },
    ],
  },
];
