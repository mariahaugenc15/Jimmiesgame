import type { ReactNode } from "react";

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

/** Small-caps label + optional icon, used inside a Card to introduce what it contains. */
export function SectionHeader({ icon, title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={`mb-3 flex items-start gap-2 ${className ?? ""}`}>
      {icon && <span className="mt-0.5 text-primary-400">{icon}</span>}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
