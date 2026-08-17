import { cn } from "../../lib/utils";

type AlertTone = "info" | "success" | "warning" | "destructive";

const toneClasses: Record<AlertTone, string> = {
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role = "status",
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={cn("rounded-lg border px-4 py-3 text-sm shadow-sm", toneClasses[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-1", "text-foreground/90")}>{children}</div>}
    </div>
  );
}
