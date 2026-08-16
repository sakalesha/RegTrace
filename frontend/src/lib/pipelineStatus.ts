// Statuses where a background agent is actively working on a document.
// Polling for live updates only makes sense while a document is in one of
// these states. Once a document reaches a terminal status (e.g.
// CLAUSES_CREATED, OBLIGATIONS_EXTRACTED, TASKS_CREATED, or any *_FAILED /
// PROCESSING_CANCELLED) it has stopped changing and no longer needs polling.
const PROCESSING_STATUSES = new Set<string>([
  'UPLOADED',
  'PARSED',
  'CHUNKED',
  'EMBEDDED',
  'EXTRACTING_OBLIGATIONS',
  'GENERATING_TASKS',
]);

export function isProcessingStatus(status?: string): boolean {
  return !!status && PROCESSING_STATUSES.has(status);
}

export function anyDocumentProcessing(docs: Array<{ processing_status?: string }>): boolean {
  return docs.some(d => isProcessingStatus(d.processing_status));
}