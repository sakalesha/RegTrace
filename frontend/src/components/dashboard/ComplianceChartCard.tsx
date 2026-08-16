import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { complianceTrendData } from '../../data/dashboardMockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

export function ComplianceChartCard() {
  return (
    <Card className="shadow-sm border border-border bg-card">
      <CardHeader>
        <CardTitle>Compliance Overview</CardTitle>
        <CardDescription>Monthly compliance trend over the past year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={complianceTrendData}
              margin={{
                top: 5,
                right: 10,
                left: -20,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '6px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => [`${value}%`, 'Compliance']}
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Line 
                type="monotone" 
                dataKey="compliance" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
