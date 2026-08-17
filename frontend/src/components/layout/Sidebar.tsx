import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { primaryNav, navGroups } from "./nav-items";

function SidebarLink({
  name,
  href,
  icon: Icon,
  onNavigate,
}: {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === href || location.pathname.startsWith(href + "/");
  return (
    <Link
      to={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-accent/10 text-accent font-semibold"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "mr-3 h-5 w-5 flex-shrink-0",
          isActive ? "text-accent" : "text-muted-foreground/70 group-hover:text-foreground",
        )}
      />
      {name}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="space-y-1 px-3">
      {primaryNav.map((item) => (
        <SidebarLink key={item.name} {...item} onNavigate={onNavigate} />
      ))}

      {navGroups.map((group) => (
        <div key={group.title} className="pt-5 first:pt-3">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => (
              <SidebarLink key={item.name} {...item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
