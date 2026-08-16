
import { StatusBadge } from "../ui/StatusBadge";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Avatar } from "../ui/avatar";

export function RecentDocumentsCard({ documents = [] }: { documents?: any[] }) {
  // Use first 5 documents for recent view
  const displayDocs = documents.slice(0, 5);
  
  return (
    <Card className="h-full shadow-sm border border-border bg-card flex flex-col">
      <CardHeader>
        <CardTitle>Recent Regulatory Documents</CardTitle>
        <CardDescription>Documents currently in the processing pipeline</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ul role="list" className="flex flex-col gap-1 p-2">
          {displayDocs.length === 0 ? (
            <li className="py-8 px-4 flex flex-col items-center justify-center text-center text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No documents found</p>
            </li>
          ) : displayDocs.map((doc, index) => (
            <li key={index} className="py-3 px-4 flex items-center justify-between gap-x-6 hover:bg-muted/50 rounded-md transition-colors cursor-pointer">
              <div className="flex min-w-0 gap-x-4 items-center">
                <Avatar className="h-9 w-9 bg-muted text-muted-foreground flex items-center justify-center border border-border">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </Avatar>
                <div className="min-w-0 flex-auto space-y-1">
                  <p className="text-sm font-semibold leading-none text-foreground">
                    {doc.title || doc.document_id}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {new Date(doc.upload_timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex flex-none items-center gap-x-4">
                <StatusBadge status={doc.processing_status} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
