import type { ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <TopNavbar />
      <Sidebar />
      <main className="md:pl-64 pt-16 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
