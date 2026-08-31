import type { NFLPlayer, WeeklyStatLine } from "@lockedin/shared";
import { SEED_PLAYERS } from "./seedPlayers.js";
import type { StatsProvider } from "./types.js";

/** Deterministic string hash -> mulberry32 PRNG, so the same player+week always produces the same "real" stat line. */
function seededRandom(key: string): () => number {
  let h = 1779033703 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function range(rand: () => number, min: number, max: number): number {
  return Math.round(min + rand() * (max - min));
}

function statsForPlayer(player: Omit<NFLPlayer, "id"> & { id: string }, season: number, week: number): WeeklyStatLine {
  const rand = seededRandom(`${player.externalId}-${season}-${week}`);
  const base: WeeklyStatLine = { playerId: player.id, season, week };

  switch (player.position) {
    case "QB": {
      base.passAttempts = range(rand, 25, 42);
      base.passCompletions = Math.round(base.passAttempts * (0.6 + rand() * 0.15));
      base.passYards = range(rand, 180, 340);
      base.passTDs = range(rand, 0, 4);
      base.interceptions = range(rand, 0, 2);
      base.rushAttempts = range(rand, 0, 8);
      base.rushYards = range(rand, 0, 55);
      base.rushTDs = rand() > 0.85 ? 1 : 0;
      break;
    }
    case "RB": {
      base.rushAttempts = range(rand, 10, 24);
      base.rushYards = range(rand, 30, 140);
      base.rushTDs = rand() > 0.6 ? range(rand, 0, 2) : 0;
      base.targets = range(rand, 1, 7);
      base.receptions = Math.round(base.targets * (0.6 + rand() * 0.3));
      base.receivingYards = range(rand, 0, 60);
      base.fumblesLost = rand() > 0.92 ? 1 : 0;
      break;
    }
    case "WR": {
      base.targets = range(rand, 4, 13);
      base.receptions = Math.round(base.targets * (0.5 + rand() * 0.35));
      base.receivingYards = range(rand, 20, 150);
      base.receivingTDs = rand() > 0.65 ? range(rand, 0, 2) : 0;
      base.rushAttempts = rand() > 0.9 ? 1 : 0;
      base.rushYards = base.rushAttempts ? range(rand, 0, 15) : 0;
      break;
    }
    case "TE": {
      base.targets = range(rand, 2, 9);
      base.receptions = Math.round(base.targets * (0.55 + rand() * 0.3));
      base.receivingYards = range(rand, 10, 100);
      base.receivingTDs = rand() > 0.75 ? 1 : 0;
      break;
    }
    case "K": {
      base.fieldGoalsAttempted = range(rand, 1, 4);
      base.fieldGoalsMade = Math.min(base.fieldGoalsAttempted, range(rand, 0, base.fieldGoalsAttempted));
      base.longestFieldGoal = range(rand, 28, 56);
      base.extraPointsMade = range(rand, 0, 4);
      break;
    }
    case "DEF": {
      base.tackles = range(rand, 30, 55);
      base.sacks = range(rand, 0, 6);
      base.interceptionsForced = range(rand, 0, 3);
      base.fumbleRecoveries = range(rand, 0, 2);
      base.defensiveTDs = rand() > 0.85 ? 1 : 0;
      base.pointsAllowed = range(rand, 6, 31);
      break;
    }
  }
  return base;
}

export class MockStatsProvider implements StatsProvider {
  private players: NFLPlayer[] = SEED_PLAYERS.map((p, i) => ({
    ...p,
    id: `seed-${i}-${p.externalId}`,
  }));

  async listActivePlayers(): Promise<NFLPlayer[]> {
    return this.players;
  }

  async getWeeklyStats(season: number, week: number): Promise<WeeklyStatLine[]> {
    return this.players.map((p) => statsForPlayer(p, season, week));
  }

  async getPlayerWeeklyStats(
    playerExternalId: string,
    season: number,
    week: number,
  ): Promise<WeeklyStatLine | null> {
    const player = this.players.find((p) => p.externalId === playerExternalId);
    if (!player) return null;
    return statsForPlayer(player, season, week);
  }
}
