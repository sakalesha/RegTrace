import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = React.forwardRef(({ className, variant = "primary", size = "default", ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-btn font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-ink text-paper hover:bg-ink-light",
    gold: "bg-gold text-white hover:bg-gold-light",
    ghost: "bg-transparent hover:bg-paper text-ink",
    outline: "border border-line bg-transparent hover:bg-paper text-ink",
    destructive: "bg-transparent text-rust border border-rust/50 hover:bg-rust/10",
    success: "bg-moss text-white hover:bg-moss/90",
  };
  
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-10 px-8",
    icon: "h-9 w-9",
  };

  return (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});
Button.displayName = "Button";
