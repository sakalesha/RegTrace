import { Search, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function TopNavbarInner({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-sm font-bold text-primary-foreground">
            R
          </div>
          <span className="hidden text-xl font-bold tracking-tight text-foreground sm:block">RegTrace</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <form onSubmit={submit} className="relative w-full max-w-md" role="search">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="block w-full rounded-md border border-border bg-muted/50 py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:leading-6 transition-colors"
            placeholder="Search obligations, documents, tasks..."
            aria-label="Global search"
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/50 text-xs font-semibold text-muted-foreground"
          title="Compliance Officer"
          aria-label="Compliance Officer"
        >
          CO
        </span>
      </div>
    </header>
  );
}
