import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface Crumb {
  label: ReactNode;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground", className)}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {it.href ? (
            <Link to={it.href} className="transition-colors hover:text-foreground">
              {it.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground" aria-current="page">
              {it.label}
            </span>
          )}
          {i < items.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden />}
        </span>
      ))}
    </nav>
  );
}
