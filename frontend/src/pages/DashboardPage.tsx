import { useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { PageHeader } from "../components/dashboard/PageHeader";
import { KPIGrid } from "../components/dashboard/KPIGrid";
import { ComplianceChartCard } from "../components/dashboard/ComplianceChartCard";
import { RecentDocumentsCard } from "../components/dashboard/RecentDocumentsCard";
import { PendingReviewsCard } from "../components/dashboard/PendingReviewsCard";
import { PriorityActionsCard } from "../components/dashboard/PriorityActionsCard";

import { useDashboard } from "../hooks/useDashboard";
import { api } from "../lib/api";

export function DashboardPage() {
  const { stats, documents, isLoading, refetch } = useDashboard();
  const [isClearingDb, setIsClearingDb] = useState(false);
  const [dbFeedback, setDbFeedback] = useState<string | null>(null);

  const handleClearDb = async () => {
    if (!window.confirm(
      "Clear ALL data in the database? This deletes documents, clauses, obligations and tasks. This is a temporary dev utility."
    )) return;

    setIsClearingDb(true);
    setDbFeedback(null);
    try {
      const result = await api.dashboard.clearDb();
      setDbFeedback(result.message ?? "Database cleared");
      await refetch();
    } catch (err: any) {
      setDbFeedback(err.message || "Failed to clear database");
    } finally {
      setIsClearingDb(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
          </div>
          <p className="text-indigo-500 font-medium animate-pulse">Loading Live Dashboard Data...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader onClearDb={handleClearDb} isClearingDb={isClearingDb} />

        {dbFeedback && (
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            {dbFeedback}
          </div>
        )}

        <KPIGrid kpis={stats?.kpis} />

        <ComplianceChartCard />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentDocumentsCard documents={documents} />
          <PendingReviewsCard pendingReviews={stats?.pending_reviews} />
        </div>

        <PriorityActionsCard />
      </div>
    </AppLayout>
  );
}
