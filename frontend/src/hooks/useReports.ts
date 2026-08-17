import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface ReportSummary {
  total_obligations: number;
  compliant: number;
  partially_compliant: number;
  non_compliant: number;
  not_started: number;
  overall_compliance_score: number;
  total_gaps: number;
  critical_gaps: number;
  high_gaps: number;
  medium_gaps: number;
  low_gaps: number;
}

export interface AuditReport {
  report_id: string;
  report_type: string;
  document_id?: string | null;
  title: string;
  generated_at: string;
  generated_by?: string;
  summary: ReportSummary;
  compliance: any;
  gaps: any;
  obligations: any[];
  metadata: any;
}

export interface ReportListItem {
  report_id: string;
  title: string;
  report_type: string;
  document_id?: string | null;
  generated_at: string;
  overall_compliance_score: number;
  total_gaps: number;
}

export function useReports() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [current, setCurrent] = useState<AuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const data = await api.reports.list();
      setReports(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    }
  }, []);

  const preview = useCallback(async (documentId?: string | null) => {
    try {
      setIsLoading(true);
      const data = await api.reports.preview(documentId);
      setCurrent(data);
      setError(null);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to preview report');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generate = useCallback(async (documentId?: string | null) => {
    try {
      setIsLoading(true);
      const data = await api.reports.generate(documentId);
      setCurrent(data);
      await fetchList();
      setError(null);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchList]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return {
    reports,
    current,
    isLoading,
    error,
    fetchList,
    preview,
    generate,
    setCurrent,
  };
}
