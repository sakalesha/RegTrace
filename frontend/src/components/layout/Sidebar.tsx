import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Workflow,
  FileText,
  CheckSquare,
  ListTodo,
  FileCheck,
  ShieldCheck,
  LineChart,
  ClipboardList,
  Bot,
  Settings,
  BookOpen,
} from "lucide-react";
import { cn } from "../../lib/utils";

export function Sidebar() {
  const location = useLocation();
  
  // Extract documentId from URL if present to make Clauses link dynamic
  const match = location.pathname.match(/\/documents\/([^\/]+)/);
  const currentDocumentId = match ? match[1] : null;
  const clausesHref = currentDocumentId ? `/documents/${currentDocumentId}/clauses` : "/clauses";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Pipeline", href: "/pipeline", icon: Workflow },
    { name: "Documents", href: "/documents", icon: FileText },
    { name: "Clauses", href: clausesHref, icon: BookOpen },
    { name: "Obligations", href: "/obligations", icon: CheckSquare },
    { name: "Tasks", href: "/tasks", icon: ListTodo },
    { name: "Evidence", href: "/evidence", icon: FileCheck },
    { name: "Compliance", href: "/compliance", icon: ShieldCheck },
    { name: "Gap Analysis", href: "/gap-analysis", icon: LineChart },
    { name: "Audit Reports", href: "/reports", icon: ClipboardList },
    { name: "AI Query", href: "/ai-query", icon: Bot },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-64 flex-col border-r border-border bg-background hidden md:flex">
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground/70 group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
