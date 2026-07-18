import React, { useState, useEffect } from "react";
import { LayoutDashboard, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { getDashboard, getGaps } from "../api/client";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

function StatCard({ label, value, colorClass }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate font-semibold mb-1">{label}</div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
    </Card>
  );
}

export default function DashboardPage({ documentId }) {
  const [stats, setStats] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashData, gapsData] = await Promise.all([
        getDashboard(documentId),
        getGaps()
      ]);
      setStats(dashData);
      setGaps(gapsData);
    } catch (e) {
      console.error("Failed to load dashboard", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, [documentId]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate p-12 text-sm text-center">
        {loading ? (
          <>
            <RefreshCw size={24} className="animate-spin text-ink mb-4" />
            Loading compliance dashboard...
          </>
        ) : (
          "No data available. Please run the ingestion pipeline first."
        )}
      </div>
    );
  }

  const statConfig = [
    { label: "Clauses scanned", value: 12, colorClass: "text-ink" }, // Mocked since API doesn't return clause count
    { label: "Obligations extracted", value: stats.obligations?.total || 0, colorClass: "text-gold" },
    { label: "Avg. confidence", value: `${Math.round((stats.obligations?.avg_confidence || 0) * 100)}%`, colorClass: "text-ink" },
    { label: "Pending review", value: stats.obligations?.pending || 0, colorClass: "text-gold" },
    { label: "Open tasks", value: stats.tasks?.open || 0, colorClass: "text-slate" },
    { label: "Overdue tasks", value: stats.tasks?.overdue || 0, colorClass: "text-rust" },
    { label: "Compliance gaps", value: stats.gaps?.total || 0, colorClass: "text-rust" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={20} className="text-gold" />
          <h2 className="text-xl font-bold tracking-tight text-ink">Compliance Dashboard</h2>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={loading} className="gap-2">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> 
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statConfig.map((s, i) => (
          <StatCard key={i} label={s.label} value={s.value} colorClass={s.colorClass} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-bold text-ink">
            <Clock size={16} className="text-gold" />
            Recent audit activity
          </div>
          <div className="space-y-3">
            <div className="text-xs text-slate font-mono flex gap-4">
              <span className="w-8">#45</span>
              <span className="w-32 font-bold text-gold">TASK_COMPLETED</span>
              <span>10:45 AM</span>
            </div>
            <div className="text-xs text-slate font-mono flex gap-4">
              <span className="w-8">#44</span>
              <span className="w-32 font-bold text-gold">OBLIGATION_APPROVED</span>
              <span>10:30 AM</span>
            </div>
            <div className="text-xs text-slate font-mono flex gap-4">
              <span className="w-8">#43</span>
              <span className="w-32 font-bold text-gold">PIPELINE_RUN</span>
              <span>09:15 AM</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4 text-sm font-bold text-ink">
            <AlertTriangle size={16} className="text-rust" />
            Compliance gaps
          </div>
          <div className="space-y-3">
            {gaps.length === 0 ? (
              <div className="text-xs text-slate">No compliance gaps detected.</div>
            ) : (
              gaps.map(gap => (
                <div key={gap.id} className="border border-line rounded p-3 flex justify-between items-center bg-paper">
                  <div>
                    <div className="text-xs font-bold text-ink mb-1">{gap.gap_type}</div>
                    <div className="text-[11px] text-slate">{gap.description}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-gold">Resolve</Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
