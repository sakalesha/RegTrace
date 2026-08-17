import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={cn("animate-spin text-primary", className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
      {...props}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function PageLoading({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-4 py-20", className)}
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-10 w-10" />
      <p className="animate-pulse text-sm font-medium text-primary">{label}</p>
    </div>
  );
}
