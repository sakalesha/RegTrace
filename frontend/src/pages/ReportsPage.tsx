import { useState, useEffect } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { PageHeader } from "../components/ui/page-header";
import { Select } from "../components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useReports } from "../hooks/useReports";
import { api } from "../lib/api";

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Card className="shadow-sm border border-border bg-card">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold mt-1" style={{ color }}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  const { reports, current, isLoading, error, preview, generate, setCurrent } = useReports();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("ALL");

  useEffect(() => {
    api.documents.list().then(setDocuments).catch(() => setDocuments([]));
  }, []);

  const runPreview = () => preview(selected === "ALL" ? null : selected);
  const runGenerate = () => generate(selected === "ALL" ? null : selected);

  const openStored = async (reportId: string) => {
    try {
      const data = await api.reports.get(reportId);
      setCurrent(data);
    } catch (e) {
      // ignore
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Audit Reports"
          description="Generate a compliance audit report from live obligations, tasks, and evidence."
        />

        {error && (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            {error}
          </div>
        )}

        <Card className="shadow-sm border border-border bg-card">
          <CardContent className="pt-6 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label htmlFor="report-scope" className="text-sm font-medium text-foreground">Source scope</label>
              <Select
                id="report-scope"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="mt-1 w-full"
              >
                <option value="ALL">All documents</option>
                {documents.map((d) => (
                  <option key={d.document_id} value={d.document_id}>
                    {d.title ?? d.document_id}
                  </option>
                ))}
              </Select>
            </div>
            <button
              onClick={runPreview}
              className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
            >
              Preview
            </button>
            <button
              onClick={runGenerate}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Generate &amp; Save
            </button>
          </CardContent>
        </Card>

        {isLoading && !current && (
          <p className="text-sm text-muted-foreground">Loading report...</p>
        )}

        {current && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <SummaryCard label="Compliance Score" value={`${current.summary.overall_compliance_score}%`} color="hsl(var(--success))" />
              <SummaryCard label="Obligations" value={current.summary.total_obligations} color="hsl(var(--accent))" />
              <SummaryCard label="Total Gaps" value={current.summary.total_gaps} color="hsl(var(--destructive))" />
              <SummaryCard label="Critical Gaps" value={current.summary.critical_gaps} color="hsl(var(--destructive))" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="shadow-sm border border-border bg-card">
                <CardHeader>
                  <CardTitle>Compliance by Department</CardTitle>
                  <CardDescription>% of obligations fully compliant per department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(current.compliance?.by_department || []).map((d: any) => ({ name: d.key, score: d.score }))}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} domain={[0, 100]} tickFormatter={(v: any) => `${v}%`} />
                        <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }} formatter={(v: any) => [`${v}%`, "Compliant"]} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border border-border bg-card">
                <CardHeader>
                  <CardTitle>Gaps by Severity</CardTitle>
                  <CardDescription>Count of gaps per severity level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((k) => ({
                          name: k.charAt(0) + k.slice(1).toLowerCase(),
                          value: current.gaps?.by_severity?.[k] || 0,
                        }))}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--warning))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-sm border border-border bg-card">
              <CardHeader>
                <CardTitle>Top Priority Gaps</CardTitle>
                <CardDescription>Highest-severity gaps requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {(current.gaps?.top_priority_gaps || []).slice(0, 8).map((g: any, i: number) => (
                    <li key={i} className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-destructive">{g.severity}</span>
                        <span className="text-sm font-medium text-foreground">{g.obligation_action}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{g.recommended_action}</p>
                    </li>
                  ))}
                  {!(current.gaps?.top_priority_gaps || []).length && (
                    <li className="py-3 text-sm text-muted-foreground">No gaps detected.</li>
                  )}
                </ul>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border bg-card">
              <CardHeader>
                <CardTitle>Obligations Register</CardTitle>
                <CardDescription>Per-obligation compliance snapshot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th scope="col" className="py-2 pr-4 font-medium">Obligation</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Tasks</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Evidence</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Owner</th>
                  </tr>
                </thead>
                    <tbody>
                      {current.obligations.map((o: any) => (
                        <tr key={o.obligation_id} className="border-b border-border/60">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-foreground max-w-md">{o.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.is_mandatory ? "Mandatory" : "Optional"}
                              {o.is_overdue ? " · Overdue" : ""}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{o.status}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{o.tasks_completed}/{o.tasks_total}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{o.evidence_accepted}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{o.department || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <a
                href={api.reports.exportUrl(current.report_id, "pdf", current.document_id)}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Export PDF
              </a>
              <a
                href={api.reports.exportUrl(current.report_id, "json", current.document_id)}
                download={`report_${current.report_id}.json`}
                className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                Export JSON
              </a>
            </div>
          </>
        )}

        <Card className="shadow-sm border border-border bg-card">
          <CardHeader>
            <CardTitle>Report History</CardTitle>
            <CardDescription>Previously generated audit reports</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {reports.map((r) => (
                <li key={r.report_id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.generated_at).toLocaleString()} · score {r.overall_compliance_score}% · {r.total_gaps} gaps
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openStored(r.report_id)}
                      className="px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium hover:bg-muted transition-colors"
                    >
                      Open
                    </button>
                    <a
                      href={api.reports.exportUrl(r.report_id, "pdf")}
                      className="px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium hover:bg-muted transition-colors"
                    >
                      PDF
                    </a>
                  </div>
                </li>
              ))}
              {!reports.length && (
                <li className="py-3 text-sm text-muted-foreground">No reports generated yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
