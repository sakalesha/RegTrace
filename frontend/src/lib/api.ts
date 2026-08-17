const rawBase = import.meta.env.VITE_API_URL || '/api';
const stripped = rawBase.replace(/\/+$/, '');
// Backend mounts all routes under /api; normalise so VITE_API_URL works
// whether or not the caller includes the /api suffix.
const API_BASE_URL = stripped.endsWith('/api') ? stripped : `${stripped}/api`;

export const api = {
  dashboard: {
    getStats: async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
    clearDb: async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/clear-db`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to clear database');
      return response.json();
    }
  },
  documents: {
    list: async () => {
      const response = await fetch(`${API_BASE_URL}/documents/`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    upload: async (formData: FormData) => {
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        // Note: Do not set Content-Type header when sending FormData with fetch,
        // the browser will automatically set it along with the correct boundary.
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = 'Failed to upload document';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errorMsg);
      }

      return response.json();
    },
    delete: async (documentId: string) => {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let errorMsg = 'Failed to delete document';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errorMsg);
      }
      return response.json();
    },
  },
  clauses: {
    getByDocument: async (documentId: string) => {
      const response = await fetch(`${API_BASE_URL}/clauses/documents/${documentId}/clauses`);
      if (!response.ok) throw new Error('Failed to fetch clauses');
      return response.json();
    },
    getById: async (clauseId: string) => {
      const response = await fetch(`${API_BASE_URL}/clauses/${clauseId}`);
      if (!response.ok) throw new Error('Failed to fetch clause');
      return response.json();
    },
    segment: async (documentId: string) => {
      const response = await fetch(`${API_BASE_URL}/clauses/documents/${documentId}/segment`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to start clause segmentation');
      return response.json();
    }
  },
  obligations: {
    getObligations: async (documentId?: string, status?: string) => {
      let url = `${API_BASE_URL}/obligations/`;
      const params = new URLSearchParams();
      if (documentId) params.append('document_id', documentId);
      if (status) params.append('status', status);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch obligations');
      return response.json();
    },
    extract: async (documentId: string) => {
      const response = await fetch(`${API_BASE_URL}/obligations/document/${documentId}/extract`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to start extraction');
      return response.json();
    },
    review: async (id: string, data: any) => {
      const response = await fetch(`${API_BASE_URL}/obligations/${id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to review obligation');
      return response.json();
    },
    bulkApprove: async (ids: string[]) => {
      const response = await fetch(`${API_BASE_URL}/obligations/bulk-approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligation_ids: ids })
      });
      if (!response.ok) throw new Error('Failed to bulk approve');
      return response.json();
    }
  },
  tasks: {
    list: async (params?: { document_id?: string; status?: string; department?: string; priority?: string }) => {
      const url = new URL(`${API_BASE_URL}/tasks/`);
      if (params?.document_id) url.searchParams.append('document_id', params.document_id);
      if (params?.status) url.searchParams.append('status', params.status);
      if (params?.department) url.searchParams.append('department', params.department);
      if (params?.priority) url.searchParams.append('priority', params.priority);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    getById: async (taskId: string) => {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
    update: async (taskId: string, data: any) => {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    assign: async (taskId: string, department: string) => {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department })
      });
      if (!response.ok) throw new Error('Failed to assign task');
      return response.json();
    },
    generate: async (documentId: string) => {
      const response = await fetch(`${API_BASE_URL}/tasks/document/${documentId}/generate`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to start task generation');
      return response.json();
    }
  },
  evidence: {
    fileUrl: (evidenceId: string) => `${API_BASE_URL}/evidence/${evidenceId}/file`,
    submit: async (data: FormData) => {
      const response = await fetch(`${API_BASE_URL}/evidence/`, {
        method: 'POST',
        body: data,
      });
      if (!response.ok) {
        let errorMsg = 'Failed to submit evidence';
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errorMsg);
      }
      return response.json();
    },
    listByTask: async (taskId: string) => {
      const response = await fetch(`${API_BASE_URL}/evidence/task/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
    listByDocument: async (documentId: string) => {
      const response = await fetch(`${API_BASE_URL}/evidence/document/${documentId}`);
      if (!response.ok) throw new Error('Failed to fetch evidence');
      return response.json();
    },
    update: async (evidenceId: string, data: any) => {
      const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update evidence');
      return response.json();
    }
  },
  pipeline: {
    getOverview: async () => {
      const response = await fetch(`${API_BASE_URL}/pipeline/overview`);
      if (!response.ok) throw new Error('Failed to fetch pipeline overview');
      return response.json();
    },
    cancel: async (documentId: string) => {
      const response = await fetch(`${API_BASE_URL}/pipeline/${documentId}/cancel`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to cancel pipeline run');
      return response.json();
    }
  },
  compliance: {
    overview: async () => {
      const response = await fetch(`${API_BASE_URL}/compliance/overview`);
      if (!response.ok) throw new Error('Failed to fetch compliance overview');
      return response.json();
    },
    obligations: async (filters?: { document_id?: string; status?: string; department?: string; priority?: string }) => {
      let url = `${API_BASE_URL}/compliance/obligations`;
      const params = new URLSearchParams();
      if (filters?.document_id) params.append('document_id', filters.document_id);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.department) params.append('department', filters.department);
      if (filters?.priority) params.append('priority', filters.priority);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch compliance obligations');
      return response.json();
    }
  },
  gap: {
    overview: async () => {
      const response = await fetch(`${API_BASE_URL}/gap/overview`);
      if (!response.ok) throw new Error('Failed to fetch gap overview');
      return response.json();
    },
    items: async (filters?: { severity?: string; type?: string; department?: string }) => {
      let url = `${API_BASE_URL}/gap/items`;
      const params = new URLSearchParams();
      if (filters?.severity) params.append('severity', filters.severity);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.department) params.append('department', filters.department);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch gap items');
      return response.json();
    }
  },
  reports: {
    list: async () => {
      const response = await fetch(`${API_BASE_URL}/reports/`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      return response.json();
    },
    generate: async (documentId?: string | null) => {
      const response = await fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId ?? null }),
      });
      if (!response.ok) throw new Error('Failed to generate report');
      return response.json();
    },
    preview: async (documentId?: string | null) => {
      const response = await fetch(`${API_BASE_URL}/reports/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId ?? null }),
      });
      if (!response.ok) throw new Error('Failed to preview report');
      return response.json();
    },
    get: async (reportId: string) => {
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}`);
      if (!response.ok) throw new Error('Failed to fetch report');
      return response.json();
    },
    exportUrl: (reportId: string, format: 'json' | 'pdf' = 'pdf') =>
      `${API_BASE_URL}/reports/${reportId}/export?format=${format}`,
  }
};
