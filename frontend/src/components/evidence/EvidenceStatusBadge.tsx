import { StatusBadge } from "../ui/StatusBadge";

export function EvidenceStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status.replace(/_/g, " ")} />;
}
