import cron from "node-cron";
import { getActiveSeason } from "../db/seasonRepo.js";
import { advanceSeasonWeek, syncWeeklyRatings, type SyncResult } from "../rating-engine/sync.js";
import { statsProvider } from "../stats-provider/index.js";

/**
 * Pulls the latest real stats and recomputes ratings for the active season's
 * current week. If the provider knows the real NFL week (Sleeper does), that
 * takes precedence over the season's stored currentWeek and advances it —
 * this is what makes "week" actually move forward without a human touching
 * the database.
 */
export async function runWeeklySync(): Promise<SyncResult | null> {
  const season = await getActiveSeason();
  if (!season) {
    console.warn("[weekly-sync] no season found, skipping.");
    return null;
  }

  let targetWeek = season.currentWeek;
  const liveState = await statsProvider.getCurrentWeek?.().catch((err) => {
    console.warn("[weekly-sync] could not read provider's current week, falling back to stored value:", err);
    return null;
  });
  if (liveState && liveState.season === season.year) {
    targetWeek = liveState.week;
  }

  const result = await syncWeeklyRatings(statsProvider, season.year, targetWeek);

  if (targetWeek !== season.currentWeek) {
    await advanceSeasonWeek(season.id, targetWeek);
  }

  console.log(
    `[weekly-sync] season ${result.season} week ${result.week}: ${result.playersUpserted} players, ` +
      `${result.statLinesProcessed} stat lines, ${result.ratingsComputed} ratings computed.`,
  );
  return result;
}

/** Tuesday mornings (server local time), after Monday Night Football has finalized stats. */
export function scheduleWeeklyRatingSync(): void {
  cron.schedule("0 9 * * 2", () => {
    runWeeklySync().catch((err) => console.error("[weekly-sync] scheduled run failed:", err));
  });
}
