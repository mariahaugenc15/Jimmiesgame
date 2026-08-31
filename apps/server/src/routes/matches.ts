import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { matches, teams } from "../db/schema.js";
import { getMatchState, startMatch } from "../gameplay/matchRuntime.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { broadcastMatchState } from "../realtime/io.js";

export const matchesRouter = Router();

const createMatchSchema = z.object({
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  week: z.number().int().min(1).max(22).default(1),
});

matchesRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { homeTeamId, awayTeamId, week } = parsed.data;
  if (homeTeamId === awayTeamId) return res.status(400).json({ error: "A team cannot play itself." });

  const [home, away] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, homeTeamId) }),
    db.query.teams.findFirst({ where: eq(teams.id, awayTeamId) }),
  ]);
  if (!home || !away) return res.status(404).json({ error: "One or both teams not found." });

  const [match] = await db.insert(matches).values({ homeTeamId, awayTeamId, week, status: "scheduled" }).returning();
  res.status(201).json(match);
});

matchesRouter.post("/:id/start", requireAuth, async (req: AuthedRequest, res) => {
  const match = await db.query.matches.findFirst({ where: eq(matches.id, req.params.id) });
  if (!match) return res.status(404).json({ error: "Match not found." });

  const [home, away] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, match.homeTeamId) }),
    db.query.teams.findFirst({ where: eq(teams.id, match.awayTeamId) }),
  ]);
  const botTeamIds = [home, away].filter((t) => t && t.ownerId === req.auth!.userId && t.name.startsWith("Bot Squad")).map((t) => t!.id);

  const state = await startMatch(match.id, match.homeTeamId, match.awayTeamId, botTeamIds);
  await db.update(matches).set({ status: "in_progress" }).where(eq(matches.id, match.id));
  broadcastMatchState(match.id, state);
  res.json(state);
});

matchesRouter.get("/:id/state", requireAuth, async (req, res) => {
  const state = getMatchState(req.params.id);
  if (!state) return res.status(404).json({ error: "Match not started or already finished." });
  res.json(state);
});
