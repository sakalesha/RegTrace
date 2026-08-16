import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { api } from '../lib/api';
import { FileText, ArrowRight, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { StatusBadge } from '../components/ui/StatusBadge';

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
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center space-x-3">
          <BookOpen className="w-8 h-8 text-indigo-500" />
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
              Clause Explorer
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Select a document to explore its extracted regulatory clauses.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No documents found</h3>
                <p className="mt-2 text-sm text-gray-500">Upload a document first to extract and view its clauses.</p>
                <button 
                  onClick={() => navigate('/documents/upload')}
                  className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  Upload Document
                </button>
              </div>
            ) : (
              documents.map((doc) => (
                <Card 
                  key={doc.document_id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 group"
                  onClick={() => navigate(`/documents/${doc.document_id}/clauses`)}
                >
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 rounded-t-xl">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                        {doc.title || doc.document_id}
                      </CardTitle>
                      <StatusBadge status={doc.processing_status} />
                    </div>
                    <CardDescription className="text-xs mt-2">
                      Uploaded: {new Date(doc.upload_timestamp).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>View Clauses</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
