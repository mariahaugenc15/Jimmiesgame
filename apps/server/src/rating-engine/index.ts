import type { PlayerRating, Position, WeeklyStatLine } from "@jimmiesgame/shared";

const MIN_RATING = 40;
const MAX_RATING = 99;

/** Linearly maps value from [min,max] onto [MIN_RATING,MAX_RATING], clamped at both ends. */
function normalize(value: number, min: number, max: number): number {
  if (max <= min) return MIN_RATING;
  const t = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.round(MIN_RATING + clamped * (MAX_RATING - MIN_RATING));
}

function safeDiv(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

interface Attributes {
  speed: number;
  power: number;
  accuracy: number;
  catching: number;
  awareness: number;
  stamina: number;
}

/** Per-position weighting used to roll the six attributes into a single overall rating. */
const OVERALL_WEIGHTS: Record<Position, Attributes> = {
  QB: { speed: 0.1, power: 0.15, accuracy: 0.35, catching: 0, awareness: 0.3, stamina: 0.1 },
  RB: { speed: 0.3, power: 0.25, accuracy: 0, catching: 0.15, awareness: 0.15, stamina: 0.15 },
  WR: { speed: 0.3, power: 0.1, accuracy: 0.1, catching: 0.35, awareness: 0.05, stamina: 0.1 },
  TE: { speed: 0.15, power: 0.2, accuracy: 0.05, catching: 0.35, awareness: 0.1, stamina: 0.15 },
  K: { speed: 0, power: 0.35, accuracy: 0.5, catching: 0, awareness: 0.1, stamina: 0.05 },
  DEF: { speed: 0.2, power: 0.25, accuracy: 0.15, catching: 0.15, awareness: 0.2, stamina: 0.05 },
};

function computeQB(s: WeeklyStatLine): Attributes {
  const completionPct = safeDiv(s.passCompletions ?? 0, s.passAttempts ?? 0);
  const yardsPerAttempt = safeDiv(s.passYards ?? 0, s.passAttempts ?? 0);
  const rushYardsPerCarry = safeDiv(s.rushYards ?? 0, s.rushAttempts ?? 1);
  const tdIntRatio = (s.passTDs ?? 0) - (s.interceptions ?? 0) * 1.5;
  return {
    accuracy: normalize(completionPct, 0.45, 0.75),
    power: normalize(yardsPerAttempt, 5, 9.5),
    speed: normalize((s.rushYards ?? 0) + rushYardsPerCarry * 5, 0, 60),
    catching: MIN_RATING,
    awareness: normalize(tdIntRatio, -2, 4),
    stamina: normalize(s.passAttempts ?? 0, 20, 45),
  };
}

function computeRB(s: WeeklyStatLine): Attributes {
  const yardsPerCarry = safeDiv(s.rushYards ?? 0, s.rushAttempts ?? 1);
  const catchRate = safeDiv(s.receptions ?? 0, s.targets ?? 0);
  const tdVolume = (s.rushTDs ?? 0) + (s.receivingTDs ?? 0);
  return {
    speed: normalize(yardsPerCarry, 2.5, 6.5),
    power: normalize((s.rushYards ?? 0) + tdVolume * 15, 20, 150),
    catching: normalize(catchRate, 0.4, 0.9),
    accuracy: normalize((s.receivingYards ?? 0) + (s.rushYards ?? 0), 20, 150),
    awareness: normalize(-(s.fumblesLost ?? 0), -1, 0),
    stamina: normalize((s.rushAttempts ?? 0) + (s.targets ?? 0), 8, 28),
  };
}

function computeWR(s: WeeklyStatLine): Attributes {
  const yardsPerReception = safeDiv(s.receivingYards ?? 0, s.receptions ?? 1);
  const catchRate = safeDiv(s.receptions ?? 0, s.targets ?? 0);
  return {
    speed: normalize(yardsPerReception, 6, 18),
    power: normalize((s.receivingTDs ?? 0) * 20 + (s.rushYards ?? 0), 0, 40),
    catching: normalize(catchRate, 0.35, 0.85),
    accuracy: normalize(catchRate, 0.35, 0.85),
    awareness: normalize((s.receivingTDs ?? 0), 0, 2),
    stamina: normalize(s.targets ?? 0, 3, 12),
  };
}

function computeTE(s: WeeklyStatLine): Attributes {
  const catchRate = safeDiv(s.receptions ?? 0, s.targets ?? 0);
  const yardsPerReception = safeDiv(s.receivingYards ?? 0, s.receptions ?? 1);
  return {
    speed: normalize(yardsPerReception, 5, 15),
    power: normalize((s.receivingYards ?? 0) + (s.receivingTDs ?? 0) * 20, 10, 100),
    catching: normalize(catchRate, 0.4, 0.9),
    accuracy: normalize(catchRate, 0.4, 0.9),
    awareness: normalize(s.receivingTDs ?? 0, 0, 2),
    stamina: normalize(s.targets ?? 0, 2, 9),
  };
}

function computeK(s: WeeklyStatLine): Attributes {
  const fgPct = safeDiv(s.fieldGoalsMade ?? 0, s.fieldGoalsAttempted ?? 0);
  return {
    speed: MIN_RATING,
    power: normalize(s.longestFieldGoal ?? 0, 30, 58),
    catching: MIN_RATING,
    accuracy: normalize(fgPct, 0.5, 1),
    awareness: normalize((s.fieldGoalsMade ?? 0) + (s.extraPointsMade ?? 0), 1, 6),
    stamina: MIN_RATING + 20,
  };
}

function computeDEF(s: WeeklyStatLine): Attributes {
  const takeaways = (s.interceptionsForced ?? 0) + (s.fumbleRecoveries ?? 0);
  return {
    speed: normalize(takeaways + (s.defensiveTDs ?? 0) * 2, 0, 4),
    power: normalize((s.sacks ?? 0) * 2 + (s.tackles ?? 0), 25, 65),
    catching: normalize(s.interceptionsForced ?? 0, 0, 3),
    accuracy: normalize(s.tackles ?? 0, 25, 55),
    awareness: normalize(takeaways, 0, 3),
    stamina: normalize(s.tackles ?? 0, 25, 55),
  };
}

function computeAttributes(position: Position, stats: WeeklyStatLine): Attributes {
  switch (position) {
    case "QB":
      return computeQB(stats);
    case "RB":
      return computeRB(stats);
    case "WR":
      return computeWR(stats);
    case "TE":
      return computeTE(stats);
    case "K":
      return computeK(stats);
    case "DEF":
      return computeDEF(stats);
    default:
      throw new Error(`Unhandled position: ${position satisfies never}`);
  }
}

function computeOverall(position: Position, attrs: Attributes): number {
  const weights = OVERALL_WEIGHTS[position];
  const weighted =
    attrs.speed * weights.speed +
    attrs.power * weights.power +
    attrs.accuracy * weights.accuracy +
    attrs.catching * weights.catching +
    attrs.awareness * weights.awareness +
    attrs.stamina * weights.stamina;
  return Math.round(weighted);
}

/** Pure conversion of one player's weekly real-world stat line into 0-99 in-game ratings. */
export function computeRatingFromStats(
  position: Position,
  stats: WeeklyStatLine,
): PlayerRating {
  const attrs = computeAttributes(position, stats);
  const overall = computeOverall(position, attrs);
  return {
    playerId: stats.playerId,
    season: stats.season,
    week: stats.week,
    ...attrs,
    overall,
  };
}

export function computeRatingsForWeek(
  players: { id: string; position: Position }[],
  statsByPlayerId: Map<string, WeeklyStatLine>,
): PlayerRating[] {
  return players
    .map((player) => {
      const stats = statsByPlayerId.get(player.id);
      if (!stats) return null;
      return computeRatingFromStats(player.position, stats);
    })
    .filter((r): r is PlayerRating => r !== null);
}
