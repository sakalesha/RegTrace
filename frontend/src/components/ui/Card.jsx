import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Card({ className, leftAccentColor, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-card border border-line rounded-card relative overflow-hidden",
        className
      )}
      {...props}
    >
      {leftAccentColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[4px]"
          style={{ backgroundColor: leftAccentColor }}
        />
      )}
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn("px-4 pt-4 pb-2", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("p-4", className)} {...props}>
      {children}
    </div>
  );
}
