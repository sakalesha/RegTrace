import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { 
  Upload, ListChecks, CheckCircle2, Link2, LayoutDashboard, Shield, LogOut 
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const TABS = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "ingest", path: "/ingest", label: "Ingest", icon: Upload },
  { id: "review", path: "/review", label: "Review Queue", icon: ListChecks },
  { id: "tasks", path: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "trace", path: "/trace", label: "Trace", icon: Link2 },
  { id: "admin", path: "/admin", label: "Admin Settings", icon: Shield },
];

export default function AppShell() {
  const { user, logout } = useAuth();

  const visibleTabs = TABS.filter((t) => {
    if (t.id === "ingest" || t.id === "review") {
      return user?.role === "ADMIN" || user?.role === "COMPLIANCE_OFFICER";
    }
    if (t.id === "admin") {
      return user?.role === "ADMIN";
    }
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink font-sans">
      {/* Sidebar - Persistent left hand navigation rail */}
      <aside className="w-64 bg-paper border-r border-line flex flex-col justify-between hidden md:flex shrink-0">
        <div className="py-6">
          <div className="px-6 mb-8">
            <h1 className="text-xl font-bold tracking-tight text-ink">RegTrace</h1>
            <p className="text-xs text-slate mt-1">SEBI Stock Brokers</p>
          </div>

          <nav className="flex flex-col">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.id}
                  to={t.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-3 text-[13.5px] font-medium border-l-[3px] transition-colors ${
                      isActive 
                        ? "border-gold bg-white text-ink font-bold" 
                        : "border-transparent text-slate hover:bg-white/50 hover:text-ink"
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{t.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-6 border-t border-line">
          <div className="flex flex-col mb-4">
            <span className="text-sm font-bold text-ink">{user?.full_name || "User"}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded bg-white border border-line text-[10px] font-mono text-slate w-fit uppercase">
              {user?.role || "GUEST"}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-[13px] font-medium text-slate hover:text-ink transition-colors"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-paper">
        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
