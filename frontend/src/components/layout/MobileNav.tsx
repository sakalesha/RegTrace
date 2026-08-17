import { useEffect } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="absolute left-0 top-0 h-full w-64 max-w-[80%] border-r border-border bg-background p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-bold text-foreground">RegTrace</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  );
}
