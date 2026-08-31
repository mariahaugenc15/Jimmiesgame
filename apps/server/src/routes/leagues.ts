import { Router } from "express";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { leagueMembers, leagues, matches, teams } from "../db/schema.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const leaguesRouter = Router();

const createLeagueSchema = z.object({
  name: z.string().min(1).max(60),
  isPrivate: z.boolean().default(true),
});

leaguesRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createLeagueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [league] = await db
    .insert(leagues)
    .values({ name: parsed.data.name, ownerId: req.auth!.userId, isPrivate: parsed.data.isPrivate })
    .returning();
  res.status(201).json(league);
});

const joinLeagueSchema = z.object({ teamId: z.string().uuid() });

leaguesRouter.post("/:id/join", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = joinLeagueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const team = await db.query.teams.findFirst({ where: eq(teams.id, parsed.data.teamId) });
  if (!team || team.ownerId !== req.auth!.userId) return res.status(404).json({ error: "Team not found." });

  await db.insert(leagueMembers).values({ leagueId: req.params.id, teamId: team.id }).onConflictDoNothing();
  res.status(201).json({ leagueId: req.params.id, teamId: team.id });
});

leaguesRouter.get("/:id/standings", requireAuth, async (req, res) => {
  const members = await db.query.leagueMembers.findMany({ where: eq(leagueMembers.leagueId, req.params.id) });
  const teamIds = members.map((m) => m.teamId);

  const standings = await Promise.all(
    teamIds.map(async (teamId) => {
      const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
      const played = await db.query.matches.findMany({
        where: and(eq(matches.status, "completed"), or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId))),
      });
      let wins = 0;
      let losses = 0;
      let ties = 0;
      for (const match of played) {
        const isHome = match.homeTeamId === teamId;
        const ownScore = isHome ? match.homeScore : match.awayScore;
        const oppScore = isHome ? match.awayScore : match.homeScore;
        if (ownScore > oppScore) wins += 1;
        else if (ownScore < oppScore) losses += 1;
        else ties += 1;
      }
      return { teamId, teamName: team?.name ?? "Unknown", wins, losses, ties, gamesPlayed: played.length };
    }),
  );

  standings.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  res.json(standings);
});

leaguesRouter.get("/leaderboard/global", requireAuth, async (_req, res) => {
  const top = await db.query.users.findMany({ orderBy: (u, { desc: descOp }) => [descOp(u.skillRating)], limit: 50 });
  res.json(top.map((u) => ({ userId: u.id, username: u.username, skillRating: u.skillRating })));
});
