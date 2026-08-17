import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { api } from '../lib/api';
import { FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PageHeader } from '../components/ui/page-header';
import { PageLoading } from '../components/ui/spinner';

export const ClausesPage = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDocs() {
      try {
        setLoading(true);
        const data = await api.documents.list();
        setDocuments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Clause Explorer"
        description="Select a document to explore its extracted regulatory clauses."
        actions={
          <Link
            to="/pipeline"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Upload Document
          </Link>
        }
      />

      {loading ? (
        <PageLoading label="Loading clauses..." />
      ) : documents.length === 0 ? (
        <div className="col-span-full rounded-2xl border-2 border-dashed border-border bg-muted/30 py-20 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground">No documents found</h3>
          <p className="mt-2 text-sm text-muted-foreground">Upload a document first to extract and view its clauses.</p>
          <Link
            to="/pipeline"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Upload Document
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card
              key={doc.document_id}
              className="cursor-pointer border border-border transition-colors hover:border-accent/50 hover:shadow-md group"
              onClick={() => navigate(`/documents/${doc.document_id}/clauses`)}
            >
              <CardHeader className="rounded-t-xl border-b border-border bg-muted/30 pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="line-clamp-2 text-base font-semibold text-foreground">
                    {doc.title || doc.document_id}
                  </CardTitle>
                  <StatusBadge status={doc.processing_status} />
                </div>
                <CardDescription className="mt-2 text-xs">
                  Uploaded: {new Date(doc.upload_timestamp).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4 pt-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>View Clauses</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary -translate-x-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
};
