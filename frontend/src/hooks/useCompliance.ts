import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface ComplianceOverview {
  overall_score: number;
  total_obligations: number;
  status_counts: Record<string, number>;
  by_department: any[];
  by_category: any[];
  by_priority: any[];
  critical_gaps: any[];
}

export interface ObligationCompliance {
  obligation_id: string;
  document_id: string;
  action: string;
  actor: string;
  is_mandatory: boolean;
  deadline?: string | null;
  status: string;
  is_overdue: boolean;
  tasks_total: number;
  tasks_completed: number;
  evidence_total: number;
  evidence_accepted: number;
  department?: string | null;
  category?: string | null;
  priority?: string | null;
}

export function useCompliance() {
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [obligations, setObligations] = useState<ObligationCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.compliance.overview();
      setOverview(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance overview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchObligations = useCallback(async (filters?: any) => {
    try {
      const data = await api.compliance.obligations(filters);
      setObligations(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance obligations');
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchObligations();
  }, [fetchOverview, fetchObligations]);

  return {
    overview,
    obligations,
    isLoading,
    error,
    fetchOverview,
    fetchObligations,
  };
}
