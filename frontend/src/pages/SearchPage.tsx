import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { PageHeader } from '../components/ui/page-header';
import { Select } from '../components/ui/input';
import { api } from '../lib/api';
import { useSearch } from '../hooks/useSearch';
import type { SearchResult } from '../hooks/useSearch';
import { Search, FileText, ListChecks, FileSpreadsheet, Loader2, X } from 'lucide-react';

const MODES = [
  { value: 'ALL', label: 'All' },
  { value: 'KEYWORD', label: 'Keyword' },
  { value: 'SEMANTIC', label: 'Semantic' },
];
const TYPES = [
  { value: 'ALL', label: 'All types' },
  { value: 'CLAUSE', label: 'Clauses' },
  { value: 'OBLIGATION', label: 'Obligations' },
  { value: 'DOCUMENT', label: 'Documents' },
];

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ text, q }: { text: string; q: string }) {
  const tokens = useMemo(() => q.trim().split(/\s+/).filter(Boolean).map(escapeRegExp), [q]);
  if (!tokens.length) return <>{text}</>;
  const re = new RegExp(`^(${tokens.join('|')})$`, 'i');
  const parts = text.split(new RegExp(`(${tokens.join('|')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <mark key={i} className="bg-warning/20 text-foreground rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const TYPE_ICON: Record<string, ReactNode> = {
  CLAUSE: <FileText className="w-4 h-4" />,
  OBLIGATION: <ListChecks className="w-4 h-4" />,
  DOCUMENT: <FileSpreadsheet className="w-4 h-4" />,
};

const TYPE_BADGE: Record<string, string> = {
  CLAUSE: 'bg-accent/10 text-accent',
  OBLIGATION: 'bg-accent/10 text-accent',
  DOCUMENT: 'bg-warning/10 text-warning',
};

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [mode, setMode] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [documentId, setDocumentId] = useState('');
  const [documents, setDocuments] = useState<{ document_id: string; title?: string }[]>([]);
  const { results, total, isLoading, error, run } = useSearch();
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  const execute = (query: string) => {
    run({ q: query, mode, type, document_id: documentId || undefined });
  };

  // Run on mount / when filters change if there is a query.
  useEffect(() => {
    if (q.trim()) execute(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, type, documentId]);

  const onInput = (value: string) => {
    setQ(value);
    setSearchParams(value ? { q: value } : {}, { replace: true });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => execute(value), 350);
  };

  const onFilterChange = (patch: Partial<{ mode: string; type: string; documentId: string }>) => {
    if (patch.mode !== undefined) setMode(patch.mode);
    if (patch.type !== undefined) setType(patch.type);
    if (patch.documentId !== undefined) setDocumentId(patch.documentId);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Search"
          description="Keyword and semantic search across clauses, obligations, and documents."
        />

        {/* Query */}
        <div className="relative mb-4">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            autoFocus
            value={q}
            onChange={e => onInput(e.target.value)}
            placeholder="Search obligations, clauses, documents..."
            className="block w-full rounded-xl border border-input bg-background py-3 pl-11 pr-10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {q && (
            <button
              onClick={() => onInput('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => onFilterChange({ mode: m.value })}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  mode === m.value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="w-48">
            <Select
              id="search-type"
              value={type}
              onChange={(e) => onFilterChange({ type: e.target.value })}
              aria-label="Result type"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>

          <div className="w-56">
            <Select
              id="search-document"
              value={documentId}
              onChange={(e) => onFilterChange({ documentId: e.target.value })}
              aria-label="Document"
            >
              <option value="">All documents</option>
              {documents.map((d) => (
                <option key={d.document_id} value={d.document_id}>{d.title ?? d.document_id}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Searching...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        ) : !q.trim() ? (
          <div className="text-center py-16 text-muted-foreground">Type a query to begin searching.</div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            No results for <span className="font-medium text-foreground">“{q}”</span>.
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{total} result{total === 1 ? '' : 's'}</p>
            <div className="space-y-3">
              {results.map((r: SearchResult, i) => (
                <Link
                  key={`${r.type}-${r.id}-${i}`}
                  to={r.link}
                  className="block p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${TYPE_BADGE[r.type] || 'bg-muted text-muted-foreground'}`}>
                        {TYPE_ICON[r.type]}
                        {r.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        score {r.score.toFixed(3)}
                      </span>
                    </div>
                    {r.meta?.status && (
                      <span className="text-xs text-muted-foreground">{r.meta.status}</span>
                    )}
                  </div>
                  <p className="font-medium text-foreground leading-snug">{r.title}</p>
                  {r.snippet && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                      <Highlight text={r.snippet} q={q} />
                    </p>
                  )}
                  {r.meta?.actor && (
                    <p className="mt-1 text-xs text-muted-foreground">Actor: {r.meta.actor}</p>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};
