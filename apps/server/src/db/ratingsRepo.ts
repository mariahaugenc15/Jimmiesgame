import { and, eq } from "drizzle-orm";
import type { PlayerRating, WeeklyStatLine } from "@lockedin/shared";
import { db } from "./client.js";
import { playerRatings, weeklyStats } from "./schema.js";

export async function upsertWeeklyStats(lines: WeeklyStatLine[]): Promise<void> {
  for (const line of lines) {
    const { playerId, season, week, ...stats } = line;
    await db
      .insert(weeklyStats)
      .values({ playerId, season, week, stats })
      .onConflictDoUpdate({
        target: [weeklyStats.playerId, weeklyStats.season, weeklyStats.week],
        set: { stats },
      });
  }
}

export async function upsertPlayerRatings(ratings: PlayerRating[]): Promise<void> {
  for (const rating of ratings) {
    await db
      .insert(playerRatings)
      .values(rating)
      .onConflictDoUpdate({
        target: [playerRatings.playerId, playerRatings.season, playerRatings.week],
        set: {
          speed: rating.speed,
          power: rating.power,
          accuracy: rating.accuracy,
          catching: rating.catching,
          awareness: rating.awareness,
          stamina: rating.stamina,
          overall: rating.overall,
        },
      });
  }
}

/** Persisted ratings for one week, keyed by playerId. Empty map if the sync job hasn't run for that week yet. */
export async function getRatingsForWeek(season: number, week: number): Promise<Map<string, PlayerRating>> {
  const rows = await db.query.playerRatings.findMany({
    where: and(eq(playerRatings.season, season), eq(playerRatings.week, week)),
  });
  return new Map(rows.map((r) => [r.playerId, r]));
}

/** A player's most recent persisted rating at or before the given week, for trend/history views. */
export async function getRatingHistory(playerId: string, season: number): Promise<PlayerRating[]> {
  const rows = await db.query.playerRatings.findMany({
    where: and(eq(playerRatings.playerId, playerId), eq(playerRatings.season, season)),
    orderBy: (r, { asc }) => [asc(r.week)],
  });
  return rows;
}
