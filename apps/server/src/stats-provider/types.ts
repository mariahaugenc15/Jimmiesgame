import type { NFLPlayer, WeeklyStatLine } from "@lockedin/shared";

/**
 * Swappable interface for pulling real NFL player data and weekly stats.
 * Implementations: MockStatsProvider (local dev, deterministic fake data),
 * SleeperStatsProvider (real, keyless), and any future provider (SportsDataIO,
 * nflverse) behind the same shape.
 */
export interface StatsProvider {
  listActivePlayers(): Promise<NFLPlayer[]>;
  getWeeklyStats(season: number, week: number): Promise<WeeklyStatLine[]>;
  getPlayerWeeklyStats(playerExternalId: string, season: number, week: number): Promise<WeeklyStatLine | null>;
  /**
   * The provider's authoritative "what week is it right now" (e.g. Sleeper's
   * /v1/state/nfl). Returns null for providers with no such concept (the mock),
   * in which case callers fall back to advancing the stored season.currentWeek.
   */
  getCurrentWeek?(): Promise<{ season: number; week: number } | null>;
}
