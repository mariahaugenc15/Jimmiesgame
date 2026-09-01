import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isTeamIconShape, TEAM_ICON_EMOJI } from "@lockedin/shared";
import { db } from "../db/client.js";
import { teams } from "../db/schema.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const teamsRouter = Router();

const createTeamSchema = z.object({
  name: z.string().min(1).max(40),
  seasonId: z.string().uuid(),
});

const setIconSchema = z.object({
  icon: z.string().refine((v) => isTeamIconShape(v) || TEAM_ICON_EMOJI.includes(v), {
    message: "Not a recognized team icon.",
  }),
});

teamsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [team] = await db
    .insert(teams)
    .values({ ownerId: req.auth!.userId, name: parsed.data.name, seasonId: parsed.data.seasonId })
    .returning();
  res.status(201).json(team);
});

teamsRouter.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const mine = await db.query.teams.findMany({ where: eq(teams.ownerId, req.auth!.userId) });
  res.json(mine);
});

// Basic team identity (id/name/icon) is public to any authenticated user —
// an opponent needs to see your team's name and icon on the scoreboard
// during a match.
teamsRouter.get("/:id", requireAuth, async (req, res) => {
  const team = await db.query.teams.findFirst({ where: eq(teams.id, req.params.id) });
  if (!team) return res.status(404).json({ error: "Team not found." });
  res.json({ id: team.id, name: team.name, icon: team.icon });
});

teamsRouter.post("/:id/icon", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = setIconSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const team = await db.query.teams.findFirst({ where: eq(teams.id, req.params.id) });
  if (!team) return res.status(404).json({ error: "Team not found." });
  if (team.ownerId !== req.auth!.userId) return res.status(403).json({ error: "Not your team." });
  const [updated] = await db.update(teams).set({ icon: parsed.data.icon }).where(eq(teams.id, req.params.id)).returning();
  res.json({ id: updated.id, icon: updated.icon });
});
