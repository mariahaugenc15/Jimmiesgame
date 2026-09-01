import type { DownState } from "@lockedin/shared";

function downLabel(down: number): string {
  return down === 1 ? "1st" : down === 2 ? "2nd" : down === 3 ? "3rd" : "4th";
}

/**
 * At-a-glance drive progress: where the ball actually sits on the real
 * 100-yard field and how far to the first down/end zone - additive to the
 * text drive log below it, not a replacement for the play-by-play detail.
 */
export function FieldPositionTracker({ down }: { down: DownState | null }) {
  if (!down) return null;
  const ballPct = Math.max(0, Math.min(100, down.yardLine));
  const firstDownPct = Math.max(0, Math.min(100, down.yardLine + down.yardsToGo));

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>Own goal</span>
        <span className="font-semibold text-slate-300">
          {downLabel(down.down)} &amp; {down.yardsToGo} at the {down.yardLine}
        </span>
        <span>Opp goal</span>
      </div>
      <div className="relative h-3 rounded-full bg-surface-page">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary-600/40" style={{ width: `${ballPct}%` }} />
        <div
          className="absolute top-0 h-3 w-0.5 rounded-full bg-locked-400"
          style={{ left: `${firstDownPct}%` }}
          title="First down"
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-page bg-data-400 shadow-card"
          style={{ left: `${ballPct}%` }}
          title="Ball position"
        />
      </div>
    </div>
  );
}
