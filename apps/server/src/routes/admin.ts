import { Router } from "express";
import { runWeeklySync } from "../jobs/weeklyRatingSync.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const adminRouter = Router();

/** Runs the weekly stats-sync/rating-recompute job on demand, instead of waiting for its Tuesday schedule. */
adminRouter.post("/sync-ratings", requireAuth, async (_req, res) => {
  try {
    const result = await runWeeklySync();
    if (!result) return res.status(409).json({ error: "No active season to sync." });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    res.status(502).json({ error: message });
  }
});
