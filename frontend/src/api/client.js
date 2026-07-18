import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 600000, // 10 min — pipelines can be slow
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If we get a 401, clear the token and reload to trigger login redirect
      localStorage.removeItem('access_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default API;

export async function runPipeline(text, file, title = "Uploaded Document") {
  const formData = new FormData();
  if (text) formData.append('text', text);
  if (file) formData.append('file', file);
  formData.append('title', file ? file.name : title);
  formData.append('enable_mock_evidence', 'true');
  formData.append('enable_knowledge_graph', 'true');
  const { data } = await API.post('/pipeline/run', formData);
  return data;
}

export async function getPipelineStatus(executionId) {
  const { data } = await API.get(`/pipeline/status/${executionId}`);
  return data;
}

export async function getDocument(documentId) {
  const { data } = await API.get(`/documents/${documentId}`);
  return data;
}

export async function getDocumentClauses(documentId) {
  const { data } = await API.get(`/documents/${documentId}/clauses`);
  return data;
}

export async function getObligations(documentId) {
  const params = {};
  if (documentId) params.document_id = documentId;
  const { data } = await API.get('/obligations', { params });
  return data;
}

export async function approveObligation(obligationId) {
  const { data } = await API.post(`/obligations/${obligationId}/approve`);
  return data;
}

export async function rejectObligation(obligationId) {
  const { data } = await API.post(`/obligations/${obligationId}/reject`);
  return data;
}

export async function getTasks(documentId) {
  const params = {};
  if (documentId) params.document_id = documentId;
  const { data } = await API.get('/tasks', { params });
  return data;
}

export async function completeTask(taskId) {
  const { data } = await API.post(`/tasks/${taskId}/complete`);
  return data;
}

export async function getDashboard(documentId) {
  const params = {};
  if (documentId) params.document_id = documentId;
  const { data } = await API.get('/dashboard', { params });
  return data;
}

export async function getReport(documentId) {
  const { data } = await API.get('/report', { params: { document_id: documentId } });
  return data;
}

export async function getGaps() {
  const { data } = await API.get('/gaps');
  return data;
}
