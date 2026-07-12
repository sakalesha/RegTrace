import axios from 'axios';

const API = axios.create({
  baseURL: '/api/v1',
  timeout: 120000, // 2 min — pipelines can be slow
});

export async function runPipeline(text, title = "Uploaded Document") {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('title', title);
  formData.append('enable_mock_evidence', 'true');
  formData.append('enable_knowledge_graph', 'true');
  const { data } = await API.post('/pipeline/run', formData);
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
