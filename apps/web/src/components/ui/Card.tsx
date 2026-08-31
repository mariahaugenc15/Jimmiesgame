import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  /** The single most important card on a page: lighter surface, stronger shadow, a hint of primary glow. */
  elevated?: boolean;
  className?: string;
}

/** The one card shape every page builds from, so elevation/border/radius stay consistent everywhere. */
export function Card({ children, elevated, className }: CardProps) {
  return (
    <div
      className={`rounded-2xl border ${
        elevated
          ? "border-primary-500/30 bg-surface-raised shadow-raised"
          : "border-surface-border bg-surface-card shadow-card"
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
