import { useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useGap } from "../hooks/useGap";

const SEVERITY_META: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: "Critical", color: "#ef4444" },
  HIGH: { label: "High", color: "#f97316" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  LOW: { label: "Low", color: "#94a3b8" },
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

function SeverityBadge({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity] || { label: severity, color: "#94a3b8" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${meta.color}1a`, color: meta.color, border: `1px solid ${meta.color}55` }}
    >
      {meta.label}
    </span>
  );
}

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
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
            <div
              className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin"
              style={{ animationDirection: "reverse" }}
            ></div>
          </div>
          <p className="text-indigo-500 font-medium animate-pulse">Loading Gap Analysis...</p>
        </div>
      </AppLayout>
    );
  }

  const sevCounts = overview?.by_severity || {};
  const sevCards = Object.entries(SEVERITY_META).map(([key, meta]) => ({
    ...meta,
    value: sevCounts[key] || 0,
  }));

  const overviewCards = [
    { label: "Total Gaps", value: overview?.total_gaps ?? 0, color: "#6366f1" },
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
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Gap Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Concrete, prioritized compliance gaps across obligations, tasks, and evidence.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {overviewCards.map((s) => (
            <Card key={s.label} className="shadow-sm border border-border bg-card">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-semibold mt-1" style={{ color: s.color }}>
                  {s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-sm border border-border bg-card">
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

        <Card className="shadow-sm border border-border bg-card">
          <CardHeader>
            <CardTitle>Gap Register</CardTitle>
            <CardDescription>Every gap with severity and recommended remediation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              >
                <option value="">All severities</option>
                {Object.entries(SEVERITY_META).map(([k, m]) => (
                  <option key={k} value={k}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              >
                <option value="">All types</option>
                {Object.entries(TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">Severity</th>
                    <th className="py-2 pr-4 font-medium">Obligation / Task</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Owner</th>
                    <th className="py-2 pr-4 font-medium">Gap</th>
                    <th className="py-2 pr-4 font-medium">Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.gap_id} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-4">
                        <SeverityBadge severity={i.severity} />
                      </td>
                      <td className="py-3 pr-4 max-w-xs">
                        <p className="font-medium text-foreground">{i.obligation_action}</p>
                        {i.task_title && (
                          <p className="text-xs text-muted-foreground mt-0.5">{i.task_title}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {TYPE_LABELS[i.gap_type] || i.gap_type}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{i.department || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground max-w-xs">{i.description}</td>
                      <td className="py-3 pr-4 text-muted-foreground max-w-xs">{i.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <p className="text-sm text-muted-foreground py-6 text-center">
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
