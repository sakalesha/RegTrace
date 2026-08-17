import { FileText, Layers, List, AlignLeft, GripHorizontal, ShieldAlert } from 'lucide-react';

interface StatsProps {
  stats: {
    pages: number;
    chapters: number;
    sections: number;
    clauses: number;
    subClauses: number;
    obligations: number;
  };
}

export function DocumentStatsRow({ stats }: StatsProps) {
  const statItems = [
    { label: 'Pages', value: stats.pages, icon: FileText },
    { label: 'Chapters', value: stats.chapters, icon: Layers },
    { label: 'Sections', value: stats.sections, icon: List },
    { label: 'Clauses', value: stats.clauses, icon: AlignLeft },
    { label: 'Sub-clauses', value: stats.subClauses, icon: GripHorizontal },
    { label: 'Obligations', value: stats.obligations, icon: ShieldAlert },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
      {statItems.map((item, index) => (
        <div key={index} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-accent/10 p-2.5 rounded-lg">
            <item.icon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none mb-1">{item.value}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
