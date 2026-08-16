import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { Activity, type LucideIcon } from 'lucide-react';

interface KPIStatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon?: LucideIcon;
  iconBg?: string;
}

export function KPIStatCard({ title, value, description, icon: Icon = Activity, iconBg = 'border-border text-foreground bg-muted/50' }: KPIStatCardProps) {
  return (
    <Card className="shadow-sm border border-border bg-card hover:border-foreground/20 transition-colors duration-200">
      <CardContent className="flex flex-col items-start gap-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <div className={cn(`rounded-md flex items-center justify-center size-8 border`, iconBg)}>
            <Icon className="size-4" />
          </div>
        </div>

        {/* Value & Label */}
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold text-foreground tracking-tight">{value}</div>
        </div>

        <div className="text-xs text-muted-foreground flex items-center">

          {description}
        </div>
      </CardContent>
    </Card>
  );
}
