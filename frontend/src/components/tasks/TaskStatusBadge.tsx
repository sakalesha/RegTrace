import { cn } from "@/lib/utils";

interface TaskStatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  PENDING_ASSIGNMENT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  ASSIGNED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  IN_PROGRESS: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  OVERDUE: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  const safeStatus = status ?? "";
  const style = statusStyles[safeStatus.toUpperCase()] ?? statusStyles.CANCELLED;
  const label = safeStatus.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase()) || "Cancelled";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}