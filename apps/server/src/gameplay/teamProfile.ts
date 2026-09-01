import type { OffensivePlay, PlayerRating, Position } from "@lockedin/shared";
import type { DefenseProfile, OffenseProfile } from "./engine.js";

export interface RosteredPlayer {
  nflPlayerId: string;
  position: Position;
  rosterPosition: string;
  rating: PlayerRating | null;
}

const DEFAULT_RATING = 55;

/** A benched player never takes the field, so they can't be the one the play formula credits - only starters (any non-BENCH slot, including FLEX) are eligible. */
function isStarter(player: RosteredPlayer): boolean {
  return player.rosterPosition !== "BENCH";
}

function bestByPosition(players: RosteredPlayer[], positions: Position[], key: keyof PlayerRating): number {
  const candidates = players.filter((p) => isStarter(p) && positions.includes(p.position) && p.rating);
  if (candidates.length === 0) return DEFAULT_RATING;
  return Math.max(...candidates.map((p) => p.rating![key] as number));
}

/**
 * Fantasy rosters have no offensive linemen or individual defenders, so both
 * sides of the ball are summarized from the skill positions a team actually
 * drafts: DEF/ST is treated as one unit (as it already is in fantasy
 * scoring), and protection/pass-rush are proxied from overall roster quality
 * rather than simulated trench play. Only starters count toward any of
 * this - a bench player (including a higher-rated one) never affects the
 * team's on-field profile until they're moved into the starting lineup.
 */
export function buildOffenseProfile(players: RosteredPlayer[]): OffenseProfile {
  const skillPlayers = players.filter((p) => isStarter(p) && p.rating);
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

const RUN_PLAYS: OffensivePlay[] = ["inside_run", "outside_run", "play_action"];

/**
 * The specific rostered player whose rating actually drives this playcall in
 * resolvePlay() - the RB for runs (rbPower/rbSpeed), the best WR/TE for
 * passes (wrCatching/wrSpeed) as the target/receiver. Lets the client
 * attribute a resolved play to a real name instead of an anonymous dot.
 * Restricted to starters - benching a player is how you keep them out of
 * the game, even if they'd otherwise have the better rating.
 */
export function pickFeaturedPlayerId(play: OffensivePlay, players: RosteredPlayer[]): string | undefined {
  const isRun = RUN_PLAYS.includes(play);
  const positions: Position[] = isRun ? ["RB"] : ["WR", "TE"];
  const key: keyof PlayerRating = isRun ? "power" : "catching";
  const candidates = players.filter((p) => isStarter(p) && positions.includes(p.position) && p.rating);
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, p) => ((p.rating![key] as number) > (best.rating![key] as number) ? p : best))
    .nflPlayerId;
}

export function buildDefenseProfile(players: RosteredPlayer[]): DefenseProfile {
  const def = players.find((p) => isStarter(p) && p.position === "DEF" && p.rating)?.rating;
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
