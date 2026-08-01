import { forwardRef } from "react";
import { cn } from "../lib/utils";

export const Button = forwardRef(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  const variants = {
    primary:
      "bg-primary text-primary-foreground shadow-sm hover:brightness-105",
    secondary:
      "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100",
    outline:
      "border border-border bg-card text-foreground hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "bg-rose-500 text-white hover:bg-rose-600",
  };

  const sizes = {
    sm: "h-9 rounded-lg px-3 text-xs",
    md: "h-10 rounded-xl px-4 text-sm",
    lg: "h-12 rounded-xl px-5 text-sm",
    icon: "h-10 w-10 rounded-xl",
  };

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

export const Input = forwardRef(function Input(
  { label, error, className, ...props },
  ref,
) {
  return (
    <label className="block space-y-2">
      {label ? (
        <span className="text-sm font-medium text-foreground">{label}</span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15",
          error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15",
          className,
        )}
        {...props}
      />
      {error ? <span className="block text-xs text-rose-500">{error}</span> : null}
    </label>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, className, ...props },
  ref,
) {
  return (
    <label className="block space-y-2">
      {label ? (
        <span className="text-sm font-medium text-foreground">{label}</span>
      ) : null}
      <textarea
        ref={ref}
        className={cn(
          "min-h-28 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15",
          error && "border-rose-500",
          className,
        )}
        {...props}
      />
      {error ? <span className="block text-xs text-rose-500">{error}</span> : null}
    </label>
  );
});

export function Card({ className, ...props }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "neutral", className }) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({ name = "iS", className }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function Spinner({ className }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
