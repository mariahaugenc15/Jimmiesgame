import { Router } from "express";
import { db } from "../db/client.js";
import { getActiveSeason } from "../db/seasonRepo.js";
import { getRatingsForWeek } from "../db/ratingsRepo.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { computeRatingFromStats } from "../rating-engine/index.js";
import { statsProvider } from "../stats-provider/index.js";

export const playersRouter = Router();

playersRouter.get("/", requireAuth, async (req, res) => {
  const activeSeason = await getActiveSeason();
  const season = Number(req.query.season ?? activeSeason?.year ?? new Date().getFullYear());
  const week = Number(req.query.week ?? activeSeason?.currentWeek ?? 1);
  const players = await db.query.nflPlayers.findMany();

  // Prefer ratings the weekly sync job already persisted; only recompute
  // on-demand (not stored) for a week that hasn't been synced yet, so the
  // app still returns something the very first time it boots.
  const persisted = await getRatingsForWeek(season, week);
  let statsById: Map<string, Awaited<ReturnType<typeof statsProvider.getWeeklyStats>>[number]> | null = null;
  if (persisted.size === 0) {
    const weeklyStats = await statsProvider.getWeeklyStats(season, week);
    statsById = new Map(weeklyStats.map((s) => [s.playerId, s]));
  }

  res.json(
    players.map((p) => {
      const persistedRating = persisted.get(p.id);
      const stats = statsById?.get(p.id);
      const rating = persistedRating ?? (stats ? computeRatingFromStats(p.position, stats) : null);
      return { ...p, rating };
    }),
  );
});
