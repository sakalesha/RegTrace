import type { ClauseNode } from '../../data/clauseMockData';
import { FileDigit, Hash, Activity, CheckCircle2, Clock } from 'lucide-react';

interface ClauseMetadataProps {
  clause: ClauseNode | null;
}

export function ClauseMetadata({ clause }: ClauseMetadataProps) {
  if (!clause) return null;

  const wordCount = clause.text.split(/\s+/).length;
  const charCount = clause.text.length;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mt-4">
      <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Clause Metadata</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/50">
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
            <FileDigit className="w-3.5 h-3.5" /> Words / Chars
          </div>
          <div className="font-semibold text-lg">{wordCount} <span className="text-muted-foreground text-sm font-normal">/ {charCount}</span></div>
        </div>
        
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
            <Hash className="w-3.5 h-3.5" /> Hierarchy
          </div>
          <div className="font-semibold text-base">{clause.chapter}.{clause.section || clause.chapter}.{clause.clauseNumber || '0'}</div>
        </div>
        
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" /> AI Confidence
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${clause.extractionConfidence > 0.9 ? 'bg-green-500' : 'bg-orange-500'}`} 
                style={{ width: `${clause.extractionConfidence * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold">{Math.round(clause.extractionConfidence * 100)}%</span>
          </div>
        </div>
        
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" /> OCR Quality
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${clause.ocrConfidence > 0.9 ? 'bg-green-500' : 'bg-orange-500'}`} 
                style={{ width: `${clause.ocrConfidence * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold">{Math.round(clause.ocrConfidence * 100)}%</span>
          </div>
        </div>
      </div>
      
      <div className="bg-muted/30 px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Processed 10:03 AM
        </div>
        <div>
          ID: {clause.id}
        </div>
      </div>
    </div>
  );
}
