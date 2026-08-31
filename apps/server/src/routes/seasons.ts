import { Router } from "express";
import { db } from "../db/client.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const seasonsRouter = Router();

seasonsRouter.get("/", requireAuth, async (_req, res) => {
  const all = await db.query.seasons.findMany();
  res.json(all);
});
