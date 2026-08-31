import { teamColor } from "../../lib/nflTeamColors";
import { POSITION_STYLES } from "../../lib/ui";

const RATING_MIN = 40;
const RATING_MAX = 99;

function ratingColor(overall: number): string {
  if (overall >= 85) return "text-primary-300";
  if (overall >= 70) return "text-data-300";
  if (overall >= 55) return "text-locked-300";
  return "text-danger-300";
}

function ratingBarColor(overall: number): string {
  if (overall >= 85) return "bg-primary-400";
  if (overall >= 70) return "bg-data-400";
  if (overall >= 55) return "bg-locked-400";
  return "bg-danger-400";
}

interface PlayerCardProps {
  name: string;
  position: string;
  /** The roster slot this player fills (QB/RB/.../FLEX/BENCH) - may differ from their real position for FLEX. */
  slot: string;
  team: string;
  overall: number | null;
  action?: React.ReactNode;
}

/** The roster's emotional core: a team-colored badge, a colored position pill, and a visual rating bar - not a plain text row. */
export function PlayerCard({ name, position, slot, team, overall, action }: PlayerCardProps) {
  const pct = overall ? Math.round(((overall - RATING_MIN) / (RATING_MAX - RATING_MIN)) * 100) : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 transition-colors hover:border-primary-500/30">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white/90 shadow-card"
        style={{ backgroundColor: teamColor(team) }}
      >
        {team || "—"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${POSITION_STYLES[slot] ?? POSITION_STYLES.BENCH}`}
          >
            {slot}
          </span>
          <span title={name} className="truncate text-sm font-semibold text-white">
            {name}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-border">
            <div className={`h-full rounded-full ${ratingBarColor(overall ?? 0)}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-[11px] font-bold tabular-nums ${ratingColor(overall ?? 0)}`}>
            {overall ?? "—"}
          </span>
          <span className="text-[11px] text-slate-500">{position}</span>
        </div>
      </div>

      {action}
    </div>
  );
}
