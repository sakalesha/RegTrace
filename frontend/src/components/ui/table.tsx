import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ className, children }: { className?: string; children: ReactNode }) {
  return <thead className={cn("text-left text-muted-foreground", className)}>{children}</thead>;
}

export function TBody({ className, children }: { className?: string; children: ReactNode }) {
  return <tbody className={className}>{children}</tbody>;
}

export function TR({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-border/60 last:border-0", className)} {...props}>
      {children}
    </tr>
  );
}

export function TH({
  className,
  children,
  scope = "col",
}: {
  className?: string;
  children?: ReactNode;
  scope?: "col" | "row";
}) {
  return (
    <th scope={scope} className={cn("px-3 py-2 font-medium", className)}>
      {children}
    </th>
  );
}

export function TD({ className, children, ...props }: { className?: string; children?: ReactNode } & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-3 py-3 align-top", className)} {...props}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
