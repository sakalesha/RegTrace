import { Search, Filter } from 'lucide-react';

interface SearchFilterBarProps {
  filters: {
    search: string;
    hasObligations: boolean;
    lowConfidence: boolean;
  };
  setFilters: (filters: any) => void;
}

export function SearchFilterBar({ filters, setFilters }: SearchFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clauses, keywords, obligation references..."
          className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Filters:
        </div>
        <button
          onClick={() => setFilters({ ...filters, hasObligations: !filters.hasObligations })}
          className={`shrink-0 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
            filters.hasObligations 
              ? 'bg-primary/10 border-primary/30 text-primary' 
              : 'border-border text-foreground hover:bg-muted'
          }`}
        >
          Has Obligations
        </button>
        <button
          onClick={() => setFilters({ ...filters, lowConfidence: !filters.lowConfidence })}
          className={`shrink-0 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
            filters.lowConfidence 
              ? 'bg-orange-50 border-orange-200 text-orange-700' 
              : 'border-border text-foreground hover:bg-muted'
          }`}
        >
          Low Confidence
        </button>
      </div>
    </div>
  );
}
