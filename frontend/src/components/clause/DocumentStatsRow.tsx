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
    { label: 'Pages', value: stats.pages, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Chapters', value: stats.chapters, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Sections', value: stats.sections, icon: List, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Clauses', value: stats.clauses, icon: AlignLeft, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Sub-clauses', value: stats.subClauses, icon: GripHorizontal, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Obligations', value: stats.obligations, icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
      {statItems.map((item, index) => (
        <div key={index} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className={`${item.bg} p-2.5 rounded-lg`}>
            <item.icon className={`w-5 h-5 ${item.color}`} />
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
