import { useEffect } from "react";
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

/**
 * Madden-style playcalling: each play gets a number-key hotkey (1-6 on
 * offense, 1-5 on defense) shown as an on-screen badge, in addition to
 * being clickable/tappable — keyboard on desktop, touch on mobile.
 */
export function PlayCallPanel({ mode, onSelectOffense, onSelectDefense, disabled }: PlayCallPanelProps) {
  const options = mode === "waiting" ? [] : mode === "offense" ? OFFENSIVE_PLAYS : DEFENSIVE_PLAYS;

  useEffect(() => {
    if (mode === "waiting" || disabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const index = Number(e.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= options.length) return;
      const target = document.activeElement as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const { play } = options[index];
      if (mode === "offense") onSelectOffense?.(play as OffensivePlay);
      else onSelectDefense?.(play as DefensivePlay);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, disabled, options, onSelectOffense, onSelectDefense]);

  if (mode === "waiting") {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-card p-4 text-center text-slate-400">
        Waiting for the other side…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <p className="mb-3 text-sm font-semibold text-slate-200">
        {mode === "offense" ? "Call your play" : "Call your defense"}
        <span className="ml-2 font-normal text-slate-500">
          — press the number shown, or click/tap a play
        </span>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map(({ play, label }, i) => (
          <button
            key={play}
            disabled={disabled}
            onClick={() => (mode === "offense" ? onSelectOffense?.(play as OffensivePlay) : onSelectDefense?.(play as DefensivePlay))}
            className="flex items-center gap-2 rounded-md border border-surface-border bg-surface-raised px-3 py-2 text-sm font-medium text-slate-100 transition-all hover:border-primary-500/40 hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <kbd className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-page font-mono text-xs text-primary-400">
              {i + 1}
            </kbd>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
