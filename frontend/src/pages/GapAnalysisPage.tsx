import { useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useGap } from "../hooks/useGap";
import { SeverityBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/input";
import { PageLoading } from "../components/ui/spinner";

const SEVERITY_META: Record<string, { label: string }> = {
  CRITICAL: { label: "Critical" },
  HIGH: { label: "High" },
  MEDIUM: { label: "Medium" },
  LOW: { label: "Low" },
};

const SEVERITY_VALUE_CLASS: Record<string, string> = {
  CRITICAL: "text-destructive",
  HIGH: "text-warning",
  MEDIUM: "text-info",
  LOW: "text-muted-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  OBLIGATION_NOT_REVIEWED: "Not reviewed",
  OBLIGATION_REJECTED: "Rejected",
  NO_TASKS_GENERATED: "No tasks",
  TASK_UNASSIGNED: "Unassigned",
  TASK_NOT_STARTED: "Not started",
  TASK_OVERDUE: "Overdue",
  EVIDENCE_MISSING: "Evidence missing",
  EVIDENCE_SUBMITTED_PENDING: "Evidence pending",
  EVIDENCE_REJECTED: "Evidence rejected",
};

export function GapAnalysisPage() {
  const { overview, items, isLoading, error } = useGap();
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const filtered = items.filter((i) => {
    if (severityFilter && i.severity !== severityFilter) return false;
    if (typeFilter && i.gap_type !== typeFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <AppLayout>
        <PageLoading label="Loading Gap Analysis..." />
      </AppLayout>
    );
  }

  const sevCounts = overview?.by_severity || {};
  const sevCards = Object.entries(SEVERITY_META).map(([key, meta]) => ({
    ...meta,
    value: sevCounts[key] || 0,
    valueClass: SEVERITY_VALUE_CLASS[key] || "text-foreground",
  }));

  const overviewCards = [
    { label: "Total Gaps", value: overview?.total_gaps ?? 0, valueClass: "text-accent" },
    ...sevCards,
  ];

  const typeData = (overview?.by_type || []).map((t: any) => ({
    name: TYPE_LABELS[t.key] || t.key,
    key: t.key,
    total: t.total,
  }));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Gap Analysis"
          description="Concrete, prioritized compliance gaps across obligations, tasks, and evidence."
        />

        {error && (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {overviewCards.map((s) => (
            <Card key={s.label} className="border border-border bg-card shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`mt-1 text-3xl font-semibold ${s.valueClass}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Gaps by Type</CardTitle>
            <CardDescription>Volume of gaps per gap type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    dy={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "6px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--background))",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Gap Register</CardTitle>
            <CardDescription>Every gap with severity and recommended remediation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="gap-severity" className="text-xs font-medium text-muted-foreground">Severity</label>
                <Select
                  id="gap-severity"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="min-w-[180px]"
                >
                  <option value="">All severities</option>
                  {Object.entries(SEVERITY_META).map(([k, m]) => (
                    <option key={k} value={k}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="gap-type" className="text-xs font-medium text-muted-foreground">Type</label>
                <Select
                  id="gap-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="min-w-[180px]"
                >
                  <option value="">All types</option>
                  {Object.entries(TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Gap register</caption>
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Severity</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Obligation / Task</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Type</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Owner</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Gap</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.gap_id} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-4">
                        <SeverityBadge severity={i.severity} />
                      </td>
                      <td className="max-w-xs py-3 pr-4">
                        <p className="font-medium text-foreground">{i.obligation_action}</p>
                        {i.task_title && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{i.task_title}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {TYPE_LABELS[i.gap_type] || i.gap_type}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{i.department || "—"}</td>
                      <td className="max-w-xs py-3 pr-4 text-muted-foreground">{i.description}</td>
                      <td className="max-w-xs py-3 pr-4 text-muted-foreground">{i.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No gaps found{severityFilter || typeFilter ? " for the selected filters" : ""}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
