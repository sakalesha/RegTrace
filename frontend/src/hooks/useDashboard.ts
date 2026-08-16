import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export function useDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const [statsData, docsData] = await Promise.all([
        api.dashboard.getStats(),
        api.documents.list()
      ]);
      setStats(statsData);
      setDocuments(docsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    }
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      await refetch();
      setIsLoading(false);
    }

    fetchDashboardData();
  }, [refetch]);

  return {
    stats,
    documents,
    isLoading,
    error,
    refetch
  };
}
