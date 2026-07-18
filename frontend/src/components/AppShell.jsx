import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { 
  Upload, ListChecks, CheckCircle2, Link2, LayoutDashboard, Shield, Gavel, Sun, Moon, LogOut 
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "./ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

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
  const { theme, setTheme } = useTheme();
  const location = useLocation();

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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border glass-card m-3 flex flex-col justify-between hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 text-primary">
            <Gavel size={28} className="drop-shadow-[0_0_8px_rgba(176,141,63,0.5)]" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-serif text-foreground">RegTrace</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Actionable Compliance</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.id}
                  to={t.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      isActive 
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="active-nav"
                          className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                      <Icon size={18} className="z-10 relative" />
                      <span className="z-10 relative">{t.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{user?.full_name || "User"}</span>
              <span className="text-xs text-muted-foreground">{user?.role || "Guest"}</span>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background -z-10"></div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
