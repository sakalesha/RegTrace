import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Badge({ className, variant = "default", children, ...props }) {
  const baseStyles = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors";
  
  const variants = {
    default: "bg-paper text-ink",
    gold: "bg-gold text-white",
    moss: "bg-moss text-white",
    rust: "bg-rust text-white",
    role: "bg-paper text-ink font-mono uppercase border border-line",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function StatusChip({ status, className }) {
  const baseStyles = "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full";
  
  let styles = "bg-paper text-slate";
  if (status === "APPROVED" || status === "COMPLETED" || status === "approved" || status === "completed") {
    styles = "bg-moss text-white";
  } else if (status === "REJECTED" || status === "rejected") {
    styles = "bg-rust text-white";
  } else if (status === "EDITED" || status === "edited") {
    styles = "bg-gold text-white";
  } else if (status === "PENDING" || status === "pending") {
    styles = "bg-gold/20 text-gold";
  } else if (status === "OPEN" || status === "open") {
    styles = "bg-paper text-ink";
  }

  return (
    <span className={cn(baseStyles, styles, className)}>
      {status}
    </span>
  );
}

export function ConfidenceBadge({ score, className }) {
  let variant = "rust";
  if (score >= 80) variant = "moss";
  else if (score >= 55) variant = "gold";
  
  return (
    <Badge variant={variant} className={className}>
      {score}% confidence
    </Badge>
  );
}
