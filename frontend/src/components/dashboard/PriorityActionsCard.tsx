import { StatusBadge } from "../ui/StatusBadge";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { useGap } from "../../hooks/useGap";
import { Link } from "react-router-dom";

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "text-destructive",
  HIGH: "text-warning",
  MEDIUM: "text-accent",
  LOW: "text-muted-foreground",
};

export function PriorityActionsCard() {
  const { overview, isLoading } = useGap();

  const realGaps = overview?.top_priority_gaps ?? [];
  const actions = realGaps.map((g) => ({
    description: `${g.obligation_action}${g.task_title ? ` — ${g.task_title}` : ""}`,
    priority: g.severity,
  }));

  return (
    <Card className="shadow-sm border border-border bg-card">
      <CardHeader>
        <CardTitle>Today's Priority Actions</CardTitle>
        <CardDescription>
          Top-severity compliance gaps requiring immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        {actions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {isLoading ? "Loading priority actions..." : "No outstanding priority actions. All caught up."}
          </p>
        ) : (
          <ul role="list" className="flex flex-col gap-1">
            {actions.map((action, index) => (
              <li key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-md gap-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <AlertTriangle className={`h-4 w-4 ${SEVERITY_COLOR[action.priority] || "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{action.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  <StatusBadge status={action.priority} />
                  <Link to="/gap-analysis">
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                      Open
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
