import { useEffect, useMemo } from "react";
import type { DefensivePlay, OffensivePlay } from "@lockedin/shared";
import { defensePlayHint, defenseUnitInsight, offensePlayHint, type InsightPlayer } from "../lib/playInsights";
import { buildDefenseProfile, buildOffenseProfile, rankDefensivePlays, rankOffensivePlays } from "../lib/playRecommendation";
import { riskColor } from "./ProbabilityBar";

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
  /** Your own team's roster (with ratings) - drives the per-play insight hints. Omit to hide hints. */
  roster?: InsightPlayer[];
  /**
   * The opposing team's roster (with ratings) - already fetched and shown
   * elsewhere in the match (e.g. attributing their plays by name), so this
   * isn't new information leakage. Used only to rank plays by their average
   * odds against every call the opponent could make, never their actual
   * (hidden) call. Omit to hide the recommendation.
   */
  opponentRoster?: InsightPlayer[];
}

/**
 * Madden-style playcalling: each play gets a number-key hotkey (1-6 on
 * offense, 1-5 on defense) shown as an on-screen badge, in addition to
 * being clickable/tappable — keyboard on desktop, touch on mobile. When a
 * roster is provided, each button also shows a one-line insight grounded in
 * your actual personnel ratings (never the opponent's - that's hidden info).
 * When both rosters are provided, each button also shows its expected
 * success rate (averaged across every call the opponent could make) and the
 * single best play is flagged as Recommended.
 */
export function PlayCallPanel({ mode, onSelectOffense, onSelectDefense, disabled, roster, opponentRoster }: PlayCallPanelProps) {
  const options = mode === "waiting" ? [] : mode === "offense" ? OFFENSIVE_PLAYS : DEFENSIVE_PLAYS;
  const defenseInsight = roster ? defenseUnitInsight(roster) : null;

  const ranking = useMemo(() => {
    if (!roster || !opponentRoster || mode === "waiting") return null;
    if (mode === "offense") {
      return rankOffensivePlays(buildOffenseProfile(roster), buildDefenseProfile(opponentRoster));
    }
    return rankDefensivePlays(buildDefenseProfile(roster), buildOffenseProfile(opponentRoster));
  }, [mode, roster, opponentRoster]);

  const expectedByPlay = useMemo(() => {
    const map = new Map<string, number>();
    ranking?.forEach((ev) => map.set(ev.play, ev.expectedProbability));
    return map;
  }, [ranking]);

  const bestPlay = ranking?.[0]?.play;

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
      {ranking && (
        <p className="mb-3 text-[11px] text-slate-500">
          <span className="text-primary-400">★ Recommended</span> — averaged against every call they could make with
          the roster they've shown you, not their actual pick.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map(({ play, label }, i) => {
          const hint = roster
            ? mode === "offense"
              ? offensePlayHint(play as OffensivePlay, roster)
              : defensePlayHint(play as DefensivePlay, defenseInsight)
            : null;
          const expected = expectedByPlay.get(play);
          const pct = expected == null ? null : Math.round((mode === "offense" ? expected : 1 - expected) * 100);
          const isBest = ranking && bestPlay === play;
          return (
            <button
              key={play}
              disabled={disabled}
              onClick={() =>
                mode === "offense" ? onSelectOffense?.(play as OffensivePlay) : onSelectDefense?.(play as DefensivePlay)
              }
              className={`flex flex-col items-start gap-1 rounded-md border bg-surface-raised px-3 py-2 text-left text-sm font-medium text-slate-100 transition-all hover:border-primary-500/40 hover:bg-primary-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                isBest ? "border-primary-400 ring-1 ring-primary-400/60" : "border-surface-border"
              }`}
            >
              <span className="flex w-full items-center gap-2">
                <kbd className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-page font-mono text-xs text-primary-400">
                  {i + 1}
                </kbd>
                <span className="min-w-0 flex-1">
                  {isBest && <span className="text-primary-400">★ </span>}
                  {label}
                </span>
                {pct != null && (
                  <span className="shrink-0 text-[11px] font-bold" style={{ color: riskColor(pct) }}>
                    {pct}%
                  </span>
                )}
              </span>
              {hint && <span className="pl-7 text-[11px] font-normal leading-tight text-slate-400">{hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
