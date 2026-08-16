import { KPIStatCard } from "./KPIStatCard";

import { BookOpen, CheckCircle2, ListTodo, AlertTriangle } from "lucide-react";

const icons = [
  { icon: BookOpen, iconBg: 'border-border text-foreground bg-muted/50' },
  { icon: CheckCircle2, iconBg: 'border-border text-foreground bg-muted/50' },
  { icon: ListTodo, iconBg: 'border-border text-foreground bg-muted/50' },
  { icon: AlertTriangle, iconBg: 'border-border text-foreground bg-muted/50' },
];

export function KPIGrid({ kpis }: { kpis: any }) {
  const dynamicKpis = [
    {
      title: 'Total Obligations',
      value: kpis?.total_obligations || 0,
      description: 'Across all active regulations'
    },
    {
      title: 'Compliant',
      value: kpis?.compliant || 0,
      description: 'Approved obligations'
    },
    {
      title: 'Pending Tasks',
      value: kpis?.pending_tasks || 0,
      description: 'Awaiting completion'
    },
    {
      title: 'Critical Gaps',
      value: kpis?.critical_gaps || 0,
      description: 'Requires immediate action'
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {dynamicKpis.map((kpi, index) => (
        <KPIStatCard
          key={index}
          title={kpi.title}
          value={kpi.value}
          description={kpi.description}
          icon={icons[index % icons.length].icon}
          iconBg={icons[index % icons.length].iconBg}
        />
      ))}
    </div>
  );
}
