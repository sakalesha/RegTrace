import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { taskMockData } from '../data/taskMockData';
import type { Task } from '../data/taskMockData';
import { anyDocumentProcessing } from '../lib/pipelineStatus';

interface TaskFilters {
  document_id?: string;
  status?: string;
  department?: string;
  priority?: string;
}

const USE_MOCK = false;

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anyProcessing, setAnyProcessing] = useState(false);

  const fetchTasks = useCallback(async (filters?: TaskFilters, showLoading = true) => {
    if (USE_MOCK) {
      let filtered = taskMockData;
      if (filters?.status) filtered = filtered.filter(t => t.status === filters.status);
      if (filters?.department) filtered = filtered.filter(t => t.assigned_department === filters.department);
      if (filters?.priority) filtered = filtered.filter(t => t.priority === filters.priority);
      setTasks(filtered);
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) setIsLoading(true);
      const data = await api.tasks.list(filters);
      setTasks(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const checkProcessing = useCallback(async () => {
    try {
      const docs = await api.documents.list();
      setAnyProcessing(anyDocumentProcessing(docs));
    } catch {
      // Ignore status check failures; fall back to no polling.
      setAnyProcessing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    checkProcessing();
  }, [fetchTasks, checkProcessing]);

  useEffect(() => {
    if (!anyProcessing) return;
    const intervalId = setInterval(() => {
      fetchTasks(undefined, false);
      checkProcessing();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [anyProcessing, fetchTasks, checkProcessing]);

  const generateTasks = async (documentId: string) => {
    const result = await api.tasks.generate(documentId);
    return result;
  };

  const updateTask = async (taskId: string, data: any) => {
    const updated = await api.tasks.update(taskId, data);
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updated } : t)));
    return updated;
  };

  const assignTask = async (taskId: string, department: string) => {
    const updated = await api.tasks.assign(taskId, department);
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updated } : t)));
    return updated;
  };

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    generateTasks,
    updateTask,
    assignTask,
  };
}