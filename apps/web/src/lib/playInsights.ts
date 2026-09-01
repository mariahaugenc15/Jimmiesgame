import type { DefensivePlay, OffensivePlay, PlayerRating, PlayResult } from "@lockedin/shared";

export interface InsightPlayer {
  id: string;
  name: string;
  position: string;
  rating: PlayerRating | null;
  /** The roster slot they occupy (QB/RB/WR/TE/FLEX/DEF/K/BENCH) - a benched player never takes the field. */
  rosterPosition: string;
}

/** A benched player never takes the field, so they're never featured/counted toward a team's on-field profile. */
export function isStarter(player: InsightPlayer): boolean {
  return player.rosterPosition !== "BENCH";
}

const RUN_PLAYS: OffensivePlay[] = ["inside_run", "outside_run", "play_action"];

export function shortenName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

/** Which rating attribute actually drives this play type, per the server's resolvePlay/teamProfile.ts. */
export function offenseAttributeFor(play: OffensivePlay): { key: keyof PlayerRating; label: string } {
  return RUN_PLAYS.includes(play) ? { key: "power", label: "power" } : { key: "catching", label: "catching" };
}

/**
 * Mirrors the server's teamProfile.ts pickFeaturedPlayerId: same positions
 * (RB for runs, WR/TE for passes) and the same attribute it ranks on, so
 * this lines up with the actual player the engine attributes the play to,
 * not a separately-invented guess.
 */
export function bestOffensePlayerFor(play: OffensivePlay, roster: InsightPlayer[]): InsightPlayer | null {
  const isRun = RUN_PLAYS.includes(play);
  const positions = isRun ? ["RB"] : ["WR", "TE"];
  const { key } = offenseAttributeFor(play);
  const candidates = roster.filter((p) => isStarter(p) && positions.includes(p.position) && p.rating);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, p) => ((p.rating![key] as number) > (best.rating![key] as number) ? p : best));
}

/** Short pre-snap hint for a PlayCallPanel button, e.g. "D. Achane · 95 power". */
export function offensePlayHint(play: OffensivePlay, roster: InsightPlayer[]): string | null {
  const player = bestOffensePlayerFor(play, roster);
  if (!player?.rating) return null;
  const { key, label } = offenseAttributeFor(play);
  return `${shortenName(player.name)} · ${player.rating[key]} ${label}`;
}

export interface DefenseUnitInsight {
  name: string;
  overall: number;
  passRush: number;
  runStop: number;
  coverage: number;
}

/** The fantasy DEF/ST roster slot's sub-ratings, mapped the same way buildDefenseProfile does server-side. */
export function defenseUnitInsight(roster: InsightPlayer[]): DefenseUnitInsight | null {
  const def = roster.find((p) => isStarter(p) && p.position === "DEF" && p.rating);
  if (!def?.rating) return null;
  return {
    name: def.name,
    overall: def.rating.overall,
    passRush: def.rating.power,
    runStop: def.rating.accuracy,
    coverage: def.rating.catching,
  };
}

const DEFENSE_ATTRIBUTE: Partial<Record<DefensivePlay, { key: keyof DefenseUnitInsight; label: string }>> = {
  run_stack: { key: "runStop", label: "run stop" },
  blitz: { key: "passRush", label: "pass rush" },
  man_coverage: { key: "coverage", label: "coverage" },
  zone_coverage: { key: "coverage", label: "coverage" },
};

/** Short pre-snap hint for a defensive call, grounded in your own unit's rating - never claims to know the opponent's call. */
export function defensePlayHint(play: DefensivePlay, insight: DefenseUnitInsight | null): string | null {
  if (!insight) return null;
  const attr = DEFENSE_ATTRIBUTE[play];
  if (!attr) return "Conservative call — low risk, keeps plays in front";
  return `Leans on your ${attr.label} (${insight[attr.key]})`;
}

/** Post-snap "why" line for the play-diagram, grounded in the actual featured player and outcome. */
export function explainOutcome(result: PlayResult, player: InsightPlayer | null): string {
  const name = player ? shortenName(player.name) : null;
  const attr = offenseAttributeFor(result.offensivePlay);
  const ratingNote = player?.rating ? ` (${player.rating[attr.key]} ${attr.label})` : "";

  switch (result.type) {
    case "touchdown":
      return name ? `${name}${ratingNote} broke free for the score.` : "Broke free for the score.";
    case "gain":
      return name ? `${name}${ratingNote} came through for the gain.` : "Positive gain.";
    case "incomplete":
      return name ? `Pass to ${name}${ratingNote} fell incomplete.` : "Pass fell incomplete.";
    case "interception":
      return name ? `${name} was covered well — picked off.` : "Picked off.";
    case "sack":
      return "Protection broke down before the play developed.";
    case "fumble":
      return name ? `${name} couldn't hang on to it.` : "Ball came loose.";
    case "turnover_on_downs":
      return "Couldn't convert — turned over on downs.";
  }
}
