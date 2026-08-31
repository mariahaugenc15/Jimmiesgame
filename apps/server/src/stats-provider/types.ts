import type { NFLPlayer, WeeklyStatLine } from "@lockedin/shared";

/**
 * Swappable interface for pulling real NFL player data and weekly stats.
 * Implementations: MockStatsProvider (local dev, deterministic fake data),
 * and future real providers (SportsDataIO, Sleeper, nflverse) behind the same shape.
 */
export interface StatsProvider {
  listActivePlayers(): Promise<NFLPlayer[]>;
  getWeeklyStats(season: number, week: number): Promise<WeeklyStatLine[]>;
  getPlayerWeeklyStats(playerExternalId: string, season: number, week: number): Promise<WeeklyStatLine | null>;
}
