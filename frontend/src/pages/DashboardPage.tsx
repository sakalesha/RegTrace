import { AppLayout } from "../components/layout/AppLayout";
import { PageHeader } from "../components/dashboard/PageHeader";
import { KPIGrid } from "../components/dashboard/KPIGrid";
import { ComplianceChartCard } from "../components/dashboard/ComplianceChartCard";
import { RecentDocumentsCard } from "../components/dashboard/RecentDocumentsCard";
import { PendingReviewsCard } from "../components/dashboard/PendingReviewsCard";
import { PriorityActionsCard } from "../components/dashboard/PriorityActionsCard";

import { useDashboard } from "../hooks/useDashboard";
import { useCompliance } from "../hooks/useCompliance";

export function DashboardPage() {
  const { stats, documents, isLoading } = useDashboard();
  const { overview } = useCompliance();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4" role="status" aria-live="polite">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-r-2 border-accent animate-spin" style={{ animationDirection: 'reverse' }}></div>
          </div>
          <p className="text-primary font-medium animate-pulse">Loading Live Dashboard Data...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader />

        <KPIGrid kpis={stats?.kpis} />

        <ComplianceChartCard overview={overview} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentDocumentsCard documents={documents} />
          <PendingReviewsCard pendingReviews={stats?.pending_reviews} />
        </div>

        <PriorityActionsCard />
      </div>
    </AppLayout>
  );
}
