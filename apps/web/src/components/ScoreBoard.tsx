import type { ClockState } from "@lockedin/shared";
import { TeamIconBadge } from "./TeamIconBadge";

interface ScoreBoardProps {
  /** null while the real team name is still loading - renders a skeleton instead of a placeholder word. */
  homeName: string | null;
  awayName: string | null;
  homeIcon?: string | null;
  awayIcon?: string | null;
  homeScore: number;
  awayScore: number;
  clock: ClockState;
  phase: string;
  /** Is the home team the browser's own team? Drives the green (you) vs red (opponent) accent. */
  isHomeMine: boolean;
  /** Who currently has the ball - drives the possession icon. Omit/null between snaps or once final. */
  possessionIsHome?: boolean | null;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function BallIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={className} aria-label="Has the ball">
      <ellipse cx="8" cy="8" rx="7" ry="4.2" fill="currentColor" />
      <path d="M2.5 8h11M5 5.6l1 1M5 10.4l1-1M11 5.6l-1 1M11 10.4l-1-1" stroke="#0d1424" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function TeamSide({
  name,
  icon,
  score,
  accent,
  hasBall,
  align,
}: {
  name: string | null;
  icon?: string | null;
  score: number;
  accent: "primary" | "danger";
  hasBall: boolean;
  align: "left" | "right";
}) {
  const color = accent === "primary" ? "text-primary-400" : "text-danger-400";
  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : "text-left"}`}>
      <TeamIconBadge icon={icon} size={26} />
      <div>
        <p className={`flex items-center gap-1.5 text-xs uppercase tracking-wide ${color} ${align === "right" ? "flex-row-reverse justify-end" : ""}`}>
          {hasBall && <BallIcon className={color} />}
          {name ?? <span className="inline-block h-3 w-16 animate-pulse rounded bg-surface-border align-middle" aria-hidden />}
        </p>
        <p className="text-2xl font-bold text-white">{score}</p>
      </div>
    </div>
  );
}

export function ScoreBoard({
  homeName,
  awayName,
  homeIcon,
  awayIcon,
  homeScore,
  awayScore,
  clock,
  phase,
  isHomeMine,
  possessionIsHome,
}: ScoreBoardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-card px-4 py-3">
      <TeamSide
        name={homeName}
        icon={homeIcon}
        score={homeScore}
        accent={isHomeMine ? "primary" : "danger"}
        hasBall={phase !== "final" && possessionIsHome === true}
        align="left"
      />
      <div className="text-center text-sm text-slate-400">
        <p>{phase === "final" ? "FINAL" : `Q${clock.quarter}`}</p>
        {phase !== "final" && <p className="font-mono">{formatClock(clock.secondsRemaining)}</p>}
      </div>
      <TeamSide
        name={awayName}
        icon={awayIcon}
        score={awayScore}
        accent={isHomeMine ? "danger" : "primary"}
        hasBall={phase !== "final" && possessionIsHome === false}
        align="right"
      />
    </div>
  );
}
