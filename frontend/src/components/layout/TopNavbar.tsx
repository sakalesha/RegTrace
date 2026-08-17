import { Search, Bell, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

export function TopNavbar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-sm">
            R
          </div>
          <span className="text-xl font-bold text-foreground hidden sm:block tracking-tight">RegTrace</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <form onSubmit={submit} className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="block w-full rounded-md border border-border bg-muted/50 py-1.5 pl-9 pr-3 text-foreground placeholder:text-muted-foreground focus:bg-background focus:border-foreground focus:ring-0 sm:text-sm sm:leading-6 transition-colors"
            placeholder="Search obligations, documents, tasks..."
            aria-label="Global search input"
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative rounded-full p-1 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors focus:outline-none"
        >
          <span className="sr-only">View notifications</span>
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
        </button>

        <div className="relative">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none transition-colors"
          >
            <span className="sr-only">User menu</span>
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
