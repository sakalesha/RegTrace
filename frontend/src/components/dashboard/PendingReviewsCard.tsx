
import { AlertCircle, FileCheck, ClipboardList, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Avatar } from "../ui/avatar";

export function PendingReviewsCard({ pendingReviews }: { pendingReviews: any }) {
  const items = [
    {
      label: "Obligations require human review",
      count: pendingReviews?.obligations || 0,
      icon: AlertCircle,
    },
    {
      label: "Tasks awaiting assignment",
      count: pendingReviews?.tasks || 0,
      icon: CheckSquare,
    },
    {
      label: "Evidence submissions pending validation",
      count: pendingReviews?.evidence || 0,
      icon: FileCheck,
    },
    {
      label: "Audit reports awaiting sign-off",
      count: pendingReviews?.auditReports || 0,
      icon: ClipboardList,
    }
  ];

  return (
    <Card className="h-full shadow-sm border border-border bg-card flex flex-col">
      <CardHeader>
        <CardTitle>Pending Approvals / Reviews</CardTitle>
        <CardDescription>Items awaiting your action</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-2">
        <ul role="list" className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li key={index} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 flex items-center justify-center border border-border bg-muted">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </Avatar>
                <span className="text-sm font-medium text-foreground group-hover:text-foreground transition-colors">{item.label}</span>
              </div>
              <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground min-w-[2rem]">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
