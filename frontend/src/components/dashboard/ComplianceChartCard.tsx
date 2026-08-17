import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

const COLORS: Record<string, string> = {
  Compliant: '#22c55e',
  'Partially Compliant': '#f59e0b',
  'Non-Compliant': '#ef4444',
  'Not Started': '#94a3b8',
};

export function ComplianceChartCard({ overview }: { overview?: any }) {
  const counts = overview?.status_counts || {};
  const data = [
    { name: 'Compliant', value: counts.COMPLIANT || 0 },
    { name: 'Partially Compliant', value: counts.PARTIALLY_COMPLIANT || 0 },
    { name: 'Non-Compliant', value: counts.NON_COMPLIANT || 0 },
    { name: 'Not Started', value: counts.NOT_STARTED || 0 },
  ];

  return (
    <Card className="shadow-sm border border-border bg-card">
      <CardHeader>
        <CardTitle>Compliance Status</CardTitle>
        <CardDescription>Distribution of obligations by compliance status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                dy={10}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '6px',
                  border: '1px solid hsl(var(--border))',
                  backgroundColor: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
