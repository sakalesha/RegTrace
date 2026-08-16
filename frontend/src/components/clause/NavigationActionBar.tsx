import { ChevronLeft, ChevronRight, Eye, ShieldAlert } from 'lucide-react';

interface NavigationActionBarProps {
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export function NavigationActionBar({ onNext, onPrev, hasNext, hasPrev }: NavigationActionBarProps) {
  return (
    <div className="fixed bottom-0 right-0 left-0 lg:left-64 bg-card border-t border-border p-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-10 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Clause
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Clause
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50 border-orange-200 transition-colors hidden sm:flex">
          <ShieldAlert className="w-4 h-4" />
          View Extracted Obligations
        </button>
        <button className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <Eye className="w-4 h-4" />
          Open Human Review
        </button>
      </div>
    </div>
  );
}
