export function EvidenceStatusBadge({ status }: { status: string }) {
  const color =
    status === 'ACCEPTED' ? 'bg-green-500/10 text-green-600' :
    status === 'REJECTED' ? 'bg-destructive/10 text-destructive' :
    'bg-blue-500/10 text-blue-600';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
