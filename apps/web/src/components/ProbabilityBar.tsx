interface ProbabilityBarProps {
  label: string;
  value: number; // 0-1
  color?: string;
}

export function ProbabilityBar({ label, value, color = "#22c55e" }: ProbabilityBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
