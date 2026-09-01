interface ProbabilityBarProps {
  label: string;
  value: number; // 0-1
  /** Explicit color overrides the automatic risk-based one - use for stats that aren't a pass/fail risk (e.g. breakaway chance). */
  color?: string;
}

/** Red/amber/green by value, so risk reads at a glance during fast play-calling - not a flat color regardless of the number. */
export function riskColor(pct: number): string {
  if (pct < 40) return "#F87171"; // danger-400
  if (pct < 70) return "#FBBF24"; // locked-400
  return "#22E29A"; // primary-400
}

export function ProbabilityBar({ label, value, color }: ProbabilityBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const fillColor = color ?? riskColor(pct);
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-semibold" style={{ color: fillColor }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: fillColor }} />
      </div>
    </div>
  );
}
