import type { Obligation } from '../../data/clauseMockData';
import { ShieldAlert, User, Clock, ArrowRight, Activity } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface RelatedObligationsPreviewProps {
  obligations: Obligation[];
}

export function RelatedObligationsPreview({ obligations }: RelatedObligationsPreviewProps) {
  if (!obligations || obligations.length === 0) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-muted-foreground" />
          Related Obligations
        </h3>
        <div className="bg-muted/20 border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
          No obligations were extracted from this clause.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-orange-500" />
          Related Obligations
          <span className="bg-orange-100 text-orange-700 text-xs py-0.5 px-2 rounded-full font-bold">
            {obligations.length}
          </span>
        </h3>
      </div>
      
      <div className="space-y-4">
        {obligations.map((obligation) => (
          <Card key={obligation.id} className="border-border shadow-sm hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <p className="font-medium text-foreground mb-3 leading-snug">
                {obligation.summary}
              </p>
              
              <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  {obligation.type}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <User className="w-3.5 h-3.5" />
                  {obligation.role}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <Clock className="w-3.5 h-3.5" />
                  {obligation.trigger}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground bg-muted px-2 py-1 rounded-md ml-auto">
                  <Activity className="w-3.5 h-3.5" />
                  {Math.round(obligation.confidence * 100)}%
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
                <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  View Full Obligation
                </button>
                <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto">
                  Open in Review Queue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
