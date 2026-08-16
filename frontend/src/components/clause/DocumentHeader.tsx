import { Download, ExternalLink, FileText, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/card';

interface DocumentHeaderProps {
  onExport?: () => void;
  onExportCsv?: () => void;
}

export function DocumentHeader({ onExport, onExportCsv }: DocumentHeaderProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">SEBI (Intermediaries) Regulations, 2026</CardTitle>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">SEBI</span>
              <span>&bull;</span>
              <span>Regulation</span>
              <span>&bull;</span>
              <span>All Intermediaries</span>
              <span>&bull;</span>
              <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Processed</span>
              <span>&bull;</span>
              <span>Today at 10:03 AM</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
            <ExternalLink className="w-4 h-4" />
            Original Document
          </button>
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </button>
          )}
          <button 
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Structured
          </button>
        </div>
      </CardHeader>
    </Card>
  );
}
