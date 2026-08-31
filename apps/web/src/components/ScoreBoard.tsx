import type { ClockState } from "@lockedin/shared";

interface ScoreBoardProps {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  clock: ClockState;
  phase: string;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ScoreBoard({ homeName, awayName, homeScore, awayScore, clock, phase }: ScoreBoardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">{homeName}</p>
        <p className="text-2xl font-bold">{homeScore}</p>
      </div>
      <div className="text-center text-sm text-slate-400">
        <p>{phase === "final" ? "FINAL" : `Q${clock.quarter}`}</p>
        {phase !== "final" && <p className="font-mono">{formatClock(clock.secondsRemaining)}</p>}
      </div>
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">{awayName}</p>
        <p className="text-2xl font-bold">{awayScore}</p>
      </div>
    </div>
  );
}
