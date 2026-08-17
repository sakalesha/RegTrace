import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCompliance } from "../hooks/useCompliance";

const STATUS_META: Record<string, { label: string; color: string }> = {
  COMPLIANT: { label: "Compliant", color: "#22c55e" },
  PARTIALLY_COMPLIANT: { label: "Partially Compliant", color: "#f59e0b" },
  NON_COMPLIANT: { label: "Non-Compliant", color: "#ef4444" },
  NOT_STARTED: { label: "Not Started", color: "#94a3b8" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, color: "#94a3b8" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${meta.color}1a`,
        color: meta.color,
        border: `1px solid ${meta.color}55`,
      }}
    >
      {meta.label}
    </span>
  );
}

export function CompliancePage() {
  const { overview, obligations, isLoading, error } = useCompliance();

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
          <p className="text-indigo-500 font-medium animate-pulse">Loading Compliance Data...</p>
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Compliance Service</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time compliance posture derived from obligations, tasks, and evidence.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            {error}
          </div>
        )}

        <Card className="shadow-sm border border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div
                className="relative flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#22c55e ${overview?.overall_score || 0}%, #e5e7eb 0)`,
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
            <CardTitle>Compliance by Department</CardTitle>
            <CardDescription>
              Share of obligations fully compliant, per assigned department
            </CardDescription>
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

        <Card className="shadow-sm border border-border bg-card">
          <CardHeader>
            <CardTitle>Critical Gaps</CardTitle>
            <CardDescription>Mandatory or overdue obligations not yet compliant</CardDescription>
          </CardHeader>
          <CardContent>
            {!overview?.critical_gaps?.length ? (
              <p className="text-sm text-muted-foreground">
                No critical gaps. All mandatory obligations are on track.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {overview.critical_gaps.map((g: any) => (
                  <li key={g.obligation_id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{g.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
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

        <Card className="shadow-sm border border-border bg-card">
          <CardHeader>
            <CardTitle>Obligations</CardTitle>
            <CardDescription>
              Compliance status per obligation (approved + tasks complete + evidence accepted)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-medium">Obligation</th>
                    <th className="py-2 pr-4 font-medium">Owner</th>
                    <th className="py-2 pr-4 font-medium">Tasks</th>
                    <th className="py-2 pr-4 font-medium">Evidence</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((o: any) => (
                    <tr key={o.obligation_id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground max-w-md">{o.action}</p>
                        <p className="text-xs text-muted-foreground">
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
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No obligations found. Upload and process a document to populate compliance data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
