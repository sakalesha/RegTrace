import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface GapItem {
  gap_id: string;
  obligation_id: string;
  obligation_action: string;
  actor: string;
  task_id?: string | null;
  task_title?: string | null;
  gap_type: string;
  severity: string;
  department?: string | null;
  category?: string | null;
  priority?: string | null;
  is_mandatory: boolean;
  is_overdue: boolean;
  description: string;
  recommended_action: string;
}

export interface GapOverview {
  total_gaps: number;
  by_severity: Record<string, number>;
  by_type: any[];
  by_department: any[];
  top_priority_gaps: GapItem[];
}

export function useGap() {
  const [overview, setOverview] = useState<GapOverview | null>(null);
  const [items, setItems] = useState<GapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.gap.overview();
      setOverview(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load gap overview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async (filters?: any) => {
    try {
      const data = await api.gap.items(filters);
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load gap items');
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchItems();
  }, [fetchOverview, fetchItems]);

  return {
    overview,
    items,
    isLoading,
    error,
    fetchOverview,
    fetchItems,
  };
}
