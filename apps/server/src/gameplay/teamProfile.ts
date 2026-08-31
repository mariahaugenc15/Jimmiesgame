import type { PlayerRating, Position } from "@jimmiesgame/shared";
import type { DefenseProfile, OffenseProfile } from "./engine.js";

export interface RosteredPlayer {
  nflPlayerId: string;
  position: Position;
  rosterPosition: string;
  rating: PlayerRating | null;
}

const DEFAULT_RATING = 55;

function bestByPosition(players: RosteredPlayer[], positions: Position[], key: keyof PlayerRating): number {
  const candidates = players.filter((p) => positions.includes(p.position) && p.rating);
  if (candidates.length === 0) return DEFAULT_RATING;
  return Math.max(...candidates.map((p) => p.rating![key] as number));
}

/**
 * Fantasy rosters have no offensive linemen or individual defenders, so both
 * sides of the ball are summarized from the skill positions a team actually
 * drafts: DEF/ST is treated as one unit (as it already is in fantasy
 * scoring), and protection/pass-rush are proxied from overall roster quality
 * rather than simulated trench play.
 */
export function buildOffenseProfile(players: RosteredPlayer[]): OffenseProfile {
  const skillPlayers = players.filter((p) => p.rating);
  const avgOverall = skillPlayers.length
    ? skillPlayers.reduce((sum, p) => sum + p.rating!.overall, 0) / skillPlayers.length
    : DEFAULT_RATING;

  return {
    qbAccuracy: bestByPosition(players, ["QB"], "accuracy"),
    qbAwareness: bestByPosition(players, ["QB"], "awareness"),
    rbSpeed: bestByPosition(players, ["RB"], "speed"),
    rbPower: bestByPosition(players, ["RB"], "power"),
    wrCatching: bestByPosition(players, ["WR", "TE"], "catching"),
    wrSpeed: bestByPosition(players, ["WR", "TE"], "speed"),
    olPower: Math.round(avgOverall),
  };
}

export function buildDefenseProfile(players: RosteredPlayer[]): DefenseProfile {
  const def = players.find((p) => p.position === "DEF" && p.rating)?.rating;
  if (!def) {
    return { passRush: DEFAULT_RATING, coverage: DEFAULT_RATING, runStop: DEFAULT_RATING, takeawayAwareness: DEFAULT_RATING };
  }
  return {
    passRush: def.power,
    runStop: def.accuracy,
    coverage: def.catching,
    takeawayAwareness: def.awareness,
  };
}
