import { Router } from "express";
import { db } from "../db/client.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { computeRatingFromStats } from "../rating-engine/index.js";
import { statsProvider } from "../stats-provider/index.js";

export const playersRouter = Router();

playersRouter.get("/", requireAuth, async (req, res) => {
  const season = Number(req.query.season ?? new Date().getFullYear());
  const week = Number(req.query.week ?? 1);
  const players = await db.query.nflPlayers.findMany();
  const weeklyStats = await statsProvider.getWeeklyStats(season, week);
  const statsById = new Map(weeklyStats.map((s) => [s.playerId, s]));

  res.json(
    players.map((p) => {
      const stats = statsById.get(p.id);
      const rating = stats ? computeRatingFromStats(p.position, stats) : null;
      return { ...p, rating };
    }),
  );
});
