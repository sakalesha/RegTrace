import { useState } from "react";
import { useCompliance } from "../hooks/useCompliance";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Pagination } from "../components/ui/pagination";
import { PageHeader } from "../components/ui/page-header";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STATUS_META: Record<string, { label: string; cssVar: string }> = {
  COMPLIANT: { label: "Compliant", cssVar: "--success" },
  PARTIALLY_COMPLIANT: { label: "Partially Compliant", cssVar: "--warning" },
  NON_COMPLIANT: { label: "Non-Compliant", cssVar: "--destructive" },
  NOT_STARTED: { label: "Not Started", cssVar: "--muted-foreground" },
};

const PAGE_SIZE = 8;

export function CompliancePage() {
  const { overview, obligations, isLoading, error } = useCompliance();
  const [page, setPage] = useState(1);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4" role="status" aria-live="polite">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
            <div
              className="absolute inset-2 rounded-full border-r-2 border-accent animate-spin"
              style={{ animationDirection: "reverse" }}
            />
          </div>
          <p className="text-primary font-medium animate-pulse">Loading Compliance Data...</p>
        </div>
      </AppLayout>
    );
  }

  const counts = overview?.status_counts || {};
  const statusCards = Object.entries(STATUS_META).map(([key, meta]) => ({
    ...meta,
    value: counts[key] || 0,
  }));

  const deptData = (overview?.by_department || []).map((d: any) => ({
    name: d.key,
    score: d.score,
    total: d.total,
  }));

  const totalPages = Math.max(1, Math.ceil(obligations.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = obligations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Compliance Posture"
          description="Real-time compliance posture derived from obligations, tasks, and evidence."
        />

        {error && (
          <Alert tone="destructive" role="alert" title="Could not load compliance data">
            {error}
          </Alert>
        )}

        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div
                className="relative flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--success)) ${overview?.overall_score || 0}%, hsl(var(--border)) 0)`,
                }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-card text-2xl font-bold text-foreground">
                  {overview?.overall_score ?? 0}%
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Compliance Score</p>
                <p className="text-3xl font-semibold text-foreground">
                  {overview?.total_obligations ?? 0} obligations tracked
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statusCards.map((s) => (
            <Card key={s.label} className="border border-border bg-card shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-3xl font-semibold" style={{ color: `hsl(var(${s.cssVar}))` }}>
                  {s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Compliance by Department</CardTitle>
            <CardDescription>Share of obligations fully compliant, per assigned department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    dy={10}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(v: any) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "6px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--background))",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(v: any) => [`${v}%`, "Compliant"]}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Critical Gaps</CardTitle>
            <CardDescription>Mandatory or overdue obligations not yet compliant</CardDescription>
          </CardHeader>
          <CardContent>
            {!overview?.critical_gaps?.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No critical gaps. All mandatory obligations are on track.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {overview.critical_gaps.map((g: any) => (
                  <li key={g.obligation_id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{g.action}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {g.department || "Unassigned"}
                        {g.is_overdue ? " · Overdue" : ""}
                      </p>
                    </div>
                    <StatusBadge status={g.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Obligations</CardTitle>
            <CardDescription>
              Compliance status per obligation (approved + tasks complete + evidence accepted)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Compliance status per obligation</caption>
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Obligation</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Owner</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Tasks</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Evidence</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((o: any) => (
                    <tr key={o.obligation_id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <p className="max-w-md font-medium text-foreground">{o.action}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {o.actor}
                          {o.is_mandatory ? " · Mandatory" : ""}
                          {o.is_overdue ? " · Overdue" : ""}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{o.department || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {o.tasks_completed}/{o.tasks_total}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {o.evidence_accepted}/{o.evidence_total}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!obligations.length && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No obligations found. Upload and process a document to populate compliance data.
                </p>
              )}
            </div>
            <Pagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={obligations.length}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
