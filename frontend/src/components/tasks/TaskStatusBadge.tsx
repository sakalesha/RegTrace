import { cn } from "@/lib/utils";
import { StatusBadge } from "../ui/StatusBadge";

export function TaskStatusBadge({ status, className }: { status: string; className?: string }) {
  const label = (status ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
  return (
    <StatusBadge
      status={label}
      className={cn("whitespace-nowrap", className)}
    />
  );
}
