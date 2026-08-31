import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { nflPlayers, seasons } from "../db/schema.js";
import { upsertPlayerRatings, upsertWeeklyStats } from "../db/ratingsRepo.js";
import type { StatsProvider } from "../stats-provider/index.js";
import { computeRatingsForWeek } from "./index.js";

export interface SyncResult {
  season: number;
  week: number;
  playersUpserted: number;
  statLinesProcessed: number;
  ratingsComputed: number;
}

async function upsertPlayers(provider: StatsProvider): Promise<number> {
  const players = await provider.listActivePlayers();
  for (const player of players) {
    await db
      .insert(nflPlayers)
      .values({
        id: player.id,
        name: player.name,
        realNflTeam: player.realNflTeam,
        position: player.position,
        externalId: player.externalId,
        jerseyNumber: player.jerseyNumber,
      })
      .onConflictDoUpdate({
        target: nflPlayers.externalId,
        set: {
          name: player.name,
          realNflTeam: player.realNflTeam,
          position: player.position,
          jerseyNumber: player.jerseyNumber,
        },
      });
  }
  return players.length;
}

/**
 * Pulls one week's real stats from the configured provider, converts them to
 * 0-99 ratings, and persists both the raw stat lines and the computed
 * ratings. This is the one place that turns "real NFL performance" into
 * "in-game attributes" for storage — everything else reads the result.
 */
export async function syncWeeklyRatings(provider: StatsProvider, season: number, week: number): Promise<SyncResult> {
  const playersUpserted = await upsertPlayers(provider);

  const rosterPlayers = await db.query.nflPlayers.findMany();
  const statLines = await provider.getWeeklyStats(season, week);
  await upsertWeeklyStats(statLines);

  const statsByPlayerId = new Map(statLines.map((s) => [s.playerId, s]));
  const ratings = computeRatingsForWeek(
    rosterPlayers.map((p) => ({ id: p.id, position: p.position })),
    statsByPlayerId,
  );
  await upsertPlayerRatings(ratings);

  return {
    season,
    week,
    playersUpserted,
    statLinesProcessed: statLines.length,
    ratingsComputed: ratings.length,
  };
}

export async function advanceSeasonWeek(seasonId: string, week: number): Promise<void> {
  await db.update(seasons).set({ currentWeek: week }).where(eq(seasons.id, seasonId));
}
