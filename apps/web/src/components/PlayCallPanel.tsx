import type { DefensivePlay, OffensivePlay } from "@lockedin/shared";

const OFFENSIVE_PLAYS: { play: OffensivePlay; label: string }[] = [
  { play: "inside_run", label: "Inside Run" },
  { play: "outside_run", label: "Outside Run" },
  { play: "short_pass", label: "Short Pass" },
  { play: "deep_pass", label: "Deep Pass" },
  { play: "play_action", label: "Play Action" },
  { play: "screen_pass", label: "Screen" },
];

const DEFENSIVE_PLAYS: { play: DefensivePlay; label: string }[] = [
  { play: "run_stack", label: "Run Stack" },
  { play: "man_coverage", label: "Man Coverage" },
  { play: "zone_coverage", label: "Zone Coverage" },
  { play: "blitz", label: "Blitz" },
  { play: "prevent", label: "Prevent" },
];

interface PlayCallPanelProps {
  mode: "offense" | "defense" | "waiting";
  onSelectOffense?: (play: OffensivePlay) => void;
  onSelectDefense?: (play: DefensivePlay) => void;
  disabled?: boolean;
}

export function PlayCallPanel({ mode, onSelectOffense, onSelectDefense, disabled }: PlayCallPanelProps) {
  if (mode === "waiting") {
    return <div className="rounded-lg bg-slate-900 p-4 text-center text-slate-400">Waiting for the other side…</div>;
  }

  const options = mode === "offense" ? OFFENSIVE_PLAYS : DEFENSIVE_PLAYS;

  return (
    <div className="rounded-lg bg-slate-900 p-4">
      <p className="mb-3 text-sm font-semibold text-slate-300">
        {mode === "offense" ? "Call your play" : "Call your defense"}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map(({ play, label }) => (
          <button
            key={play}
            disabled={disabled}
            onClick={() => (mode === "offense" ? onSelectOffense?.(play as OffensivePlay) : onSelectDefense?.(play as DefensivePlay))}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
