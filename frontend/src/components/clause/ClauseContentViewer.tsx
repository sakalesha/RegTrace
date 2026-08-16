import type { ClauseNode } from '../../data/clauseMockData';

interface ClauseContentViewerProps {
  clause: ClauseNode | null;
}

export function ClauseContentViewer({ clause }: ClauseContentViewerProps) {
  if (!clause) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border p-8">
        <p>Select a clause from the tree to view its contents.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
      <div className="mb-6 pb-4 border-b border-border">
        <h2 className="text-2xl font-bold text-foreground">
          {clause.clauseNumber ? `Clause ${clause.clauseNumber}: ` : ''}
          {clause.title}
        </h2>
        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          <span className="font-medium bg-muted px-2 py-1 rounded-md text-foreground">Chapter {clause.chapter}</span>
          <span className="font-medium bg-muted px-2 py-1 rounded-md text-foreground">Section {clause.section || clause.chapter}</span>
          <span>Page {clause.pageNumber}</span>
        </div>
      </div>
      
      <div className="prose prose-sm md:prose-base max-w-none text-foreground/90 leading-relaxed">
        {/* Render text faithfully as extracted */}
        {clause.text.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-4">{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
