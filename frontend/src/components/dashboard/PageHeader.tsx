import { Upload, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  onClearDb?: () => void;
  isClearingDb?: boolean;
}

export function PageHeader({ onClearDb, isClearingDb }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl tracking-tight">
          Compliance Dashboard
        </h1>
      </div>
      <div className="mt-4 flex items-center gap-2 sm:ml-4 sm:mt-0">
        {onClearDb && (
          <button
            onClick={onClearDb}
            disabled={isClearingDb}
            title="Temporary dev utility: wipe all data"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 hover:bg-red-500/20 h-9 px-4 py-2"
          >
            <Trash2 className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
            {isClearingDb ? "Clearing..." : "Clear DB"}
          </button>
        )}
        <Link
          to="/pipeline"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
        >
          <Upload className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
          Upload New Document
        </Link>
      </div>
    </div>
  );
}

