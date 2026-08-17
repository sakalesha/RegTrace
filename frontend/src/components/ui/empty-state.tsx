import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "empty",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "empty" | "extracting" | "failed" | "error";
  className?: string;
}) {
  const tone =
    variant === "empty"
      ? "text-muted-foreground"
      : variant === "extracting"
        ? "text-warning"
        : "text-destructive";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && <Icon className={cn("mb-3 h-12 w-12", tone, variant === "extracting" && "animate-spin")} aria-hidden />}
      <p className={cn("font-medium", variant === "empty" ? "text-foreground" : tone)}>{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
