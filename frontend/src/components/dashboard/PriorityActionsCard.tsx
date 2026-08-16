import { priorityActions } from "../../data/dashboardMockData";
import { StatusBadge } from "../ui/StatusBadge";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button-1";

export function PriorityActionsCard() {
  return (
    <Card className="shadow-sm border border-border bg-card">
      <CardHeader>
        <CardTitle>Today's Priority Actions</CardTitle>
        <CardDescription>Critical tasks requiring immediate attention</CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <ul role="list" className="flex flex-col gap-1">
          {priorityActions.map((action, index) => (
            <li key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-md gap-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertTriangle className={`h-4 w-4 ${action.priority === 'Critical' ? 'text-destructive' : action.priority === 'High' ? 'text-amber-500' : 'text-blue-500'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{action.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                <StatusBadge status={action.priority} />
                <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                  Open
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
