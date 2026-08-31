import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client.js";
import { nflPlayers, seasons } from "./schema.js";
import { statsProvider } from "../stats-provider/index.js";

export interface SetupResult {
  playersSeeded: number;
  seasonCreated: boolean;
  seasonYear: number;
}

/**
 * Creates the schema (if not already applied) and loads the NFL player pool
 * plus a season row, using the app's own shared db connection — safe to call
 * from a live server (unlike the CLI scripts, this never closes the pool).
 * Idempotent: safe to run more than once against the same database.
 */
export async function runInitialSetup(): Promise<SetupResult> {
  await migrate(db, { migrationsFolder: "./drizzle" });

  const players = await statsProvider.listActivePlayers();
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
      .onConflictDoNothing({ target: nflPlayers.externalId });
  }

  const year = new Date().getFullYear();
  const existing = await db.query.seasons.findFirst({ where: eq(seasons.year, year) });
  let seasonCreated = false;
  if (!existing) {
    await db.insert(seasons).values({
      year,
      startDate: new Date(),
      draftLockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      currentWeek: 1,
    });
    seasonCreated = true;
  }

  return { playersSeeded: players.length, seasonCreated, seasonYear: year };
}
