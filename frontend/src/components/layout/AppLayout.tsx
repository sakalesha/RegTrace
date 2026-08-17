import { useState } from "react";
import { TopNavbarInner } from "./TopNavbar";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <TopNavbarInner onMenuClick={() => setMobileOpen(true)} />
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-border bg-background md:flex">
        <div className="flex-1 overflow-y-auto py-6">
          <Sidebar />
        </div>
      </aside>
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="md:pl-64 pt-16 min-h-screen">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
