import { cn } from "../../lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let badgeColor = "bg-muted text-muted-foreground border-border";

  switch (status.toLowerCase()) {
    case "processing":
      badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      break;
    case "obligations extracted":
    case "tasks generated":
      badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      break;
    case "under review":
      badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      break;
    case "high":
      badgeColor = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      break;
    case "medium":
      badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      break;
    case "critical":
      badgeColor = "bg-destructive/10 text-destructive border-destructive/20";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
        badgeColor,
        className
      )}
    >
      {status}
    </span>
  );
}
