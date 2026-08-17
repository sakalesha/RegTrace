import { useCallback, useState } from 'react';
import { api } from '../lib/api';

export interface SearchResult {
  type: string;
  id: string;
  document_id: string;
  title: string;
  snippet: string;
  meta: Record<string, any>;
  score: number;
  link: string;
}

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (params: { q: string; mode?: string; type?: string; document_id?: string; limit?: number }) => {
    if (!params.q || !params.q.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.search.query(params);
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResults([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, total, isLoading, error, run };
}
