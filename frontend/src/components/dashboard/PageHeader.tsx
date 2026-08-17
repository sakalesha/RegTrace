import { Upload } from "lucide-react";
import { Link } from "react-router-dom";

export function PageHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-foreground tracking-tight sm:text-3xl">
          Compliance Dashboard
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/pipeline"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Upload className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
          Upload New Document
        </Link>
      </div>
    </div>
  );
}
