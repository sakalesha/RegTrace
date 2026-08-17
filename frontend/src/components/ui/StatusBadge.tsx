import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "destructive";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/10 text-info border-info/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};

const toneIcon: Record<Tone, LucideIcon> = {
  neutral: Circle,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
};

function toneForStatus(status: string): Tone {
  const s = status.toLowerCase();
  if (/(approved|accepted|compliant|completed|verified|submitted|success|embedded|clauses created|obligations extracted|tasks generated)/.test(s))
    return "success";
  if (/(rejected|non-?compliant|failed|overdue|cancelled|error|not compliant)/.test(s)) return "destructive";
  if (/(critical|high|review|pending|under review|processing|extracting|generating|assigned|partially|needs attention)/.test(s))
    return "warning";
  if (/(medium|low|info|in_progress|parsed|uploaded|chunked|parsing|pending review|not started)/.test(s)) return "info";
  return "neutral";
}

export function StatusBadge({
  status,
  tone,
  label,
  icon = true,
  className,
  children,
}: {
  status?: string;
  tone?: Tone;
  label?: string;
  icon?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const safeStatus = status ?? "";
  const resolved = tone ?? toneForStatus(safeStatus);
  const Icon = toneIcon[resolved];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[resolved],
        className,
      )}
    >
      {icon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
      {label ?? children ?? (safeStatus || "—")}
    </span>
  );
}

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  const map: Record<string, Tone> = {
    CRITICAL: "destructive",
    HIGH: "warning",
    MEDIUM: "info",
    LOW: "neutral",
  };
  const tone = map[severity.toUpperCase()] ?? "neutral";
  return <StatusBadge status={severity} tone={tone} className={className} />;
}

export type { Tone };
