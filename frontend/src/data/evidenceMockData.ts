export interface Evidence {
  [key: string]: any;
}

export const evidenceMockData: Evidence[] = [
  {
    id: "ev-1",
    title: "Q2 Compliance Report",
    fileName: "q2-report.pdf",
    status: "verified",
    createdAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "ev-2",
    title: "Trade Log Export",
    fileName: "trade-log.csv",
    status: "pending",
    createdAt: "2026-08-05T12:30:00Z",
  },
];
