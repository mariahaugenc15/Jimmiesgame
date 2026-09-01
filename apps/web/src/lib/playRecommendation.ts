import type { DefensivePlay, OffensivePlay } from "@lockedin/shared";
import { isStarter, type InsightPlayer } from "./playInsights";

/**
 * Everything here mirrors apps/server/src/gameplay/teamProfile.ts and
 * engine.ts's resolvePlay exactly - same positions, same attributes, same
 * formula - so the "best play" ranking reflects how the engine will
 * actually resolve the snap, not a separately-invented guess. The one thing
 * it can't know is which specific play the opponent will call (that's the
 * one piece of real hidden information in this game) - it never assumes a
 * call, only averages evenly across every play they *could* make with the
 * roster they've already shown you.
 */

export interface OffenseProfile {
  qbAccuracy: number;
  qbAwareness: number;
  rbSpeed: number;
  rbPower: number;
  wrCatching: number;
  wrSpeed: number;
  olPower: number;
}

export interface DefenseProfile {
  passRush: number;
  coverage: number;
  runStop: number;
  takeawayAwareness: number;
}

const DEFAULT_RATING = 55;

function bestByPosition(
  roster: InsightPlayer[],
  positions: string[],
  key: "speed" | "power" | "accuracy" | "catching" | "awareness",
): number {
  const candidates = roster.filter((p) => isStarter(p) && positions.includes(p.position) && p.rating);
  if (candidates.length === 0) return DEFAULT_RATING;
  return Math.max(...candidates.map((p) => p.rating![key] as number));
}

export function buildOffenseProfile(roster: InsightPlayer[]): OffenseProfile {
  const skillPlayers = roster.filter((p) => isStarter(p) && p.rating);
  const avgOverall = skillPlayers.length
    ? skillPlayers.reduce((sum, p) => sum + p.rating!.overall, 0) / skillPlayers.length
    : DEFAULT_RATING;

  return {
    qbAccuracy: bestByPosition(roster, ["QB"], "accuracy"),
    qbAwareness: bestByPosition(roster, ["QB"], "awareness"),
    rbSpeed: bestByPosition(roster, ["RB"], "speed"),
    rbPower: bestByPosition(roster, ["RB"], "power"),
    wrCatching: bestByPosition(roster, ["WR", "TE"], "catching"),
    wrSpeed: bestByPosition(roster, ["WR", "TE"], "speed"),
    olPower: Math.round(avgOverall),
  };
}

export function buildDefenseProfile(roster: InsightPlayer[]): DefenseProfile {
  const def = roster.find((p) => isStarter(p) && p.position === "DEF" && p.rating)?.rating;
  if (!def) {
    return { passRush: DEFAULT_RATING, coverage: DEFAULT_RATING, runStop: DEFAULT_RATING, takeawayAwareness: DEFAULT_RATING };
  }
  return { passRush: def.power, runStop: def.accuracy, coverage: def.catching, takeawayAwareness: def.awareness };
}

const RUN_PLAYS: OffensivePlay[] = ["inside_run", "outside_run", "play_action"];

/** Mirrors engine.ts's MATCHUP_MODIFIER exactly. */
const MATCHUP_MODIFIER: Record<OffensivePlay, Partial<Record<DefensivePlay, number>>> = {
  inside_run: { run_stack: -0.15, blitz: 0.05, man_coverage: 0.1, zone_coverage: 0.05, prevent: 0.2 },
  outside_run: { run_stack: -0.05, blitz: 0.15, man_coverage: 0.05, zone_coverage: 0, prevent: 0.15 },
  short_pass: { zone_coverage: -0.1, man_coverage: 0.05, blitz: 0.1, run_stack: 0.15, prevent: -0.2 },
  deep_pass: { man_coverage: -0.1, zone_coverage: -0.05, blitz: 0.1, run_stack: 0.2, prevent: -0.25 },
  play_action: { run_stack: 0.2, blitz: 0.1, man_coverage: -0.05, zone_coverage: -0.1, prevent: -0.15 },
  screen_pass: { blitz: 0.25, man_coverage: -0.05, zone_coverage: -0.1, run_stack: 0, prevent: -0.1 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Mirrors the deterministic successProbability formula inside resolvePlay - the odds this exact matchup is a "success" (completion/positive-gain), before any turnover/breakaway randomness. */
export function predictSuccessProbability(
  offensivePlay: OffensivePlay,
  defensivePlay: DefensivePlay,
  offense: OffenseProfile,
  defense: DefenseProfile,
): number {
  const modifier = MATCHUP_MODIFIER[offensivePlay][defensivePlay] ?? 0;
  if (!RUN_PLAYS.includes(offensivePlay)) {
    const offenseSkill = offensivePlay === "screen_pass" ? offense.rbPower : offense.qbAccuracy;
    return clamp(0.5 + (offenseSkill - defense.coverage) / 200 + modifier, 0.05, 0.95);
  }
  const offenseSkill = (offense.rbPower + offense.olPower) / 2;
  return clamp(0.5 + (offenseSkill - defense.runStop) / 200 + modifier, 0.05, 0.95);
}

export const ALL_OFFENSIVE_PLAYS: OffensivePlay[] = [
  "inside_run",
  "outside_run",
  "short_pass",
  "deep_pass",
  "play_action",
  "screen_pass",
];
export const ALL_DEFENSIVE_PLAYS: DefensivePlay[] = ["run_stack", "man_coverage", "zone_coverage", "blitz", "prevent"];

export interface PlayExpectedValue<T extends string> {
  play: T;
  /** 0-1: for an offensive play, the average odds of success across every defensive call the opponent could make; for a defensive play, the average odds the opponent's offense succeeds against it (lower is better defense). */
  expectedProbability: number;
}

/** Ranks offensive plays best-first by average success probability across every possible defensive response - the "best play" recommendation. */
export function rankOffensivePlays(offense: OffenseProfile, opponentDefense: DefenseProfile): PlayExpectedValue<OffensivePlay>[] {
  return ALL_OFFENSIVE_PLAYS.map((play) => {
    const total = ALL_DEFENSIVE_PLAYS.reduce((sum, d) => sum + predictSuccessProbability(play, d, offense, opponentDefense), 0);
    return { play, expectedProbability: total / ALL_DEFENSIVE_PLAYS.length };
  }).sort((a, b) => b.expectedProbability - a.expectedProbability);
}

/** Ranks defensive calls best-first by lowest average opponent success probability across every offensive play they could run. */
export function rankDefensivePlays(defense: DefenseProfile, opponentOffense: OffenseProfile): PlayExpectedValue<DefensivePlay>[] {
  return ALL_DEFENSIVE_PLAYS.map((play) => {
    const total = ALL_OFFENSIVE_PLAYS.reduce((sum, o) => sum + predictSuccessProbability(o, play, opponentOffense, defense), 0);
    return { play, expectedProbability: total / ALL_OFFENSIVE_PLAYS.length };
  }).sort((a, b) => a.expectedProbability - b.expectedProbability);
}
