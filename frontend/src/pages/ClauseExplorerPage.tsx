import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useClauseExplorer } from '../hooks/useClauseExplorer';
import { api } from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { FileText } from 'lucide-react';
import { Breadcrumbs } from '../components/ui/breadcrumbs';
import { PageLoading } from '../components/ui/spinner';
import { Select } from '../components/ui/input';
import { DocumentHeader } from '../components/clause/DocumentHeader';
import { DocumentStatsRow } from '../components/clause/DocumentStatsRow';
import { SearchFilterBar } from '../components/clause/SearchFilterBar';
import { ClauseTree } from '../components/clause/ClauseTree';
import { ClauseContentViewer } from '../components/clause/ClauseContentViewer';
import { ClauseMetadata } from '../components/clause/ClauseMetadata';
import { RelatedObligationsPreview } from '../components/clause/RelatedObligationsPreview';
import { NavigationActionBar } from '../components/clause/NavigationActionBar';

function flattenNodes(nodes: any[]): any[] {
  return nodes.reduce((acc: any[], node: any) => {
    acc.push(node);
    if (node.children && node.children.length > 0) {
      acc = acc.concat(flattenNodes(node.children));
    }
    return acc;
  }, []);
}

export function ClauseExplorerPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    api.documents.list()
      .then(setDocuments)
      .catch(err => console.error('Failed to load documents:', err));
  }, []);

  const currentDoc = documents.find((d) => d.document_id === (documentId || ''));
  const docTitle = currentDoc?.title ?? documentId ?? 'Documents';

  // Use 'default' document ID if none provided in URL for testing
  const {
    documentStats,
    treeData,
    selectedClauseId,
    setSelectedClauseId,
    selectedClause,
    expandedNodes,
    toggleNodeExpansion,
    filters,
    setFilters,
    relatedObligations,
    nextClause,
    prevClause,
    hasNext,
    hasPrev,
    isLoading,
  } = useClauseExplorer(documentId || 'doc-1');

  const handleExport = () => {
    const dataStr = JSON.stringify(treeData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `structured_clauses_${documentId || 'export'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const rows = flattenNodes(treeData);
    downloadCsv(
      `clauses_${documentId || 'export'}.csv`,
      ['Clause ID', 'Title', 'Type', 'Has Obligations', 'Text'],
      rows.map(n => [n.id, n.title, n.type, n.hasObligations ? 'Yes' : 'No', n.text])
    );
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) navigate(`/documents/${e.target.value}/clauses`);
  };

  return (
    <AppLayout>
      {isLoading ? (
        <PageLoading label="Loading clauses..." />
      ) : documents.length === 0 ? (
        <div className="border-2 border-dashed border-border bg-muted/30 rounded-2xl py-24 text-center">
          <FileText className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
          <p className="font-medium text-foreground">No documents found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a document from the Pipeline page to extract and explore its clauses.
          </p>
        </div>
      ) : (
      <>
      <Breadcrumbs
        items={[
          { label: 'Documents', href: '/documents' },
          { label: docTitle, href: documentId ? `/documents/${documentId}/clauses` : undefined },
          { label: 'Clauses' },
        ]}
      />
      <div className="pb-24"> {/* Padding bottom for fixed action bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Document:</span>
          </div>
          <Select
            id="clause-document"
            value={documentId || ''}
            onChange={handleDocumentChange}
            className="min-w-[280px]"
            aria-label="Document"
          >
            {documents.map((doc) => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.title ?? doc.document_id}
              </option>
            ))}
          </Select>
        </div>

        <DocumentHeader onExport={handleExport} onExportCsv={handleExportCsv} />
        
        <DocumentStatsRow stats={documentStats} />
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel: Clause Tree */}
          <div className="w-full lg:w-[320px] shrink-0 flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
            <SearchFilterBar filters={filters} setFilters={setFilters} />
            
            <div className="flex-1 bg-card border border-border rounded-xl p-4 overflow-y-auto shadow-sm custom-scrollbar">
              <ClauseTree
                data={treeData}
                selectedClauseId={selectedClauseId}
                onSelectClause={setSelectedClauseId}
                expandedNodes={expandedNodes}
                toggleExpansion={toggleNodeExpansion}
              />
            </div>
          </div>
          
          {/* Right Panel: Content Viewer */}
          <div className="flex-1 flex flex-col h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            <ClauseContentViewer clause={selectedClause} />
            <ClauseMetadata clause={selectedClause} />
            
            {selectedClause && (
              <RelatedObligationsPreview obligations={relatedObligations} />
            )}
          </div>
        </div>
      </div>
      
      {selectedClause && (
        <NavigationActionBar 
          onNext={nextClause} 
          onPrev={prevClause} 
          hasNext={hasNext} 
          hasPrev={hasPrev} 
        />
      )}
      </>
      )}
    </AppLayout>
  );
}
