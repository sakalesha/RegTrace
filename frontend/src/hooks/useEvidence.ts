import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { evidenceMockData } from '../data/evidenceMockData';
import type { Evidence } from '../data/evidenceMockData';

const USE_MOCK = false;

export function useEvidence() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByTask = useCallback(async (taskId: string, showLoading = true) => {
    if (USE_MOCK) {
      setEvidence(evidenceMockData.filter(e => e.task_id === taskId));
      setIsLoading(false);
      return;
    }
    try {
      if (showLoading) setIsLoading(true);
      const data = await api.evidence.listByTask(taskId);
      setEvidence(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load evidence');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const fetchByDocument = useCallback(async (documentId: string, showLoading = true) => {
    if (USE_MOCK) {
      setEvidence(evidenceMockData.filter(e => e.document_id === documentId));
      setIsLoading(false);
      return;
    }
    try {
      if (showLoading) setIsLoading(true);
      const data = await api.evidence.listByDocument(documentId);
      setEvidence(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load evidence');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const submit = async (data: FormData) => {
    const created = await api.evidence.submit(data);
    setEvidence(prev => [created, ...prev]);
    return created;
  };

  const update = async (evidenceId: string, data: any) => {
    const updated = await api.evidence.update(evidenceId, data);
    setEvidence(prev => prev.map(e => (e.id === evidenceId ? { ...e, ...updated } : e)));
    return updated;
  };

  return {
    evidence,
    isLoading,
    error,
    fetchByTask,
    fetchByDocument,
    submit,
    update,
  };
}
