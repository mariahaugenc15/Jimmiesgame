import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { drafts, nflPlayers, rosterSlots, teams } from "../db/schema.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { statsProvider } from "../stats-provider/index.js";
import { computeRatingFromStats } from "../rating-engine/index.js";
import { isValidPickForSlot, runSoloDraft, type DraftablePlayer } from "./logic.js";

export const draftRouter = Router();

const soloDraftSchema = z.object({
  teamId: z.string().uuid(),
  seasonId: z.string().uuid(),
  botCount: z.number().int().min(1).max(11).default(9),
});

async function currentDraftablePlayers(): Promise<DraftablePlayer[]> {
  const players = await db.query.nflPlayers.findMany();
  const season = new Date().getFullYear();
  const weeklyStats = await statsProvider.getWeeklyStats(season, 1);
  const statsById = new Map(weeklyStats.map((s) => [s.playerId, s]));
  return players.map((p) => {
    const stats = statsById.get(p.id);
    const overall = stats ? computeRatingFromStats(p.position, stats).overall : 50;
    return { id: p.id, position: p.position, overall };
  });
}

draftRouter.post("/solo", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = soloDraftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { teamId, seasonId, botCount } = parsed.data;

  const userTeam = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!userTeam || userTeam.ownerId !== req.auth!.userId) {
    return res.status(404).json({ error: "Team not found." });
  }
  if (userTeam.lockedAt) {
    return res.status(409).json({ error: "Team roster is already locked." });
  }

  const botTeamIds: string[] = [];
  for (let i = 0; i < botCount; i++) {
    const [bot] = await db
      .insert(teams)
      .values({ ownerId: userTeam.ownerId, name: `Bot Squad ${i + 1}`, seasonId })
      .returning();
    botTeamIds.push(bot.id);
  }

  const availablePlayers = await currentDraftablePlayers();
  const { picksByTeam } = runSoloDraft([teamId, ...botTeamIds], availablePlayers);

  for (const [participantTeamId, assignments] of picksByTeam) {
    if (assignments.length === 0) continue;
    await db.insert(rosterSlots).values(
      assignments.map((a) => ({
        teamId: participantTeamId,
        nflPlayerId: a.nflPlayerId,
        rosterPosition: a.rosterPosition,
        draftRound: a.draftRound,
      })),
    );
  }

  const [draftRecord] = await db
    .insert(drafts)
    .values({
      seasonId,
      type: "snake",
      isSolo: true,
      participantTeamIds: [teamId, ...botTeamIds],
      picks: [...picksByTeam.entries()].flatMap(([tid, picks]) => picks.map((p) => ({ teamId: tid, ...p }))),
      startedAt: new Date(),
      completedAt: new Date(),
    })
    .returning();

  res.status(201).json({
    draftId: draftRecord.id,
    yourRoster: picksByTeam.get(teamId),
    botTeamIds,
  });
});

draftRouter.get("/teams/:teamId/roster", requireAuth, async (req: AuthedRequest, res) => {
  const slots = await db.query.rosterSlots.findMany({
    where: eq(rosterSlots.teamId, req.params.teamId),
  });
  const players = await db.query.nflPlayers.findMany();
  const playerById = new Map(players.map((p) => [p.id, p]));
  res.json(
    slots.map((s) => ({
      ...s,
      player: playerById.get(s.nflPlayerId) ?? null,
    })),
  );
});

const swapSchema = z.object({
  teamId: z.string().uuid(),
  dropPlayerId: z.string(),
  addPlayerId: z.string(),
});

draftRouter.post("/swap", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = swapSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { teamId, dropPlayerId, addPlayerId } = parsed.data;

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team || team.ownerId !== req.auth!.userId) return res.status(404).json({ error: "Team not found." });
  if (team.lockedAt) return res.status(409).json({ error: "Roster is locked; no changes allowed." });

  const existingSlot = await db.query.rosterSlots.findFirst({
    where: (rs, { and, eq: eqOp }) => and(eqOp(rs.teamId, teamId), eqOp(rs.nflPlayerId, dropPlayerId)),
  });
  if (!existingSlot) return res.status(404).json({ error: "Player not on this roster." });

  const addPlayer = await db.query.nflPlayers.findFirst({ where: eq(nflPlayers.id, addPlayerId) });
  if (!addPlayer) return res.status(404).json({ error: "Replacement player not found." });

  if (!isValidPickForSlot(addPlayer.position, existingSlot.rosterPosition)) {
    return res.status(400).json({ error: `${addPlayer.position} cannot fill a ${existingSlot.rosterPosition} slot.` });
  }

  const alreadyRostered = await db.query.rosterSlots.findFirst({
    where: (rs, { and, eq: eqOp }) => and(eqOp(rs.teamId, teamId), eqOp(rs.nflPlayerId, addPlayerId)),
  });
  if (alreadyRostered) return res.status(409).json({ error: "Replacement player is already on this roster." });

  await db.transaction(async (tx) => {
    await tx
      .delete(rosterSlots)
      .where(and(eq(rosterSlots.teamId, teamId), eq(rosterSlots.nflPlayerId, dropPlayerId)));
    await tx.insert(rosterSlots).values({
      teamId,
      nflPlayerId: addPlayerId,
      rosterPosition: existingSlot.rosterPosition,
      draftRound: existingSlot.draftRound,
    });
  });

  res.json({ dropped: dropPlayerId, added: addPlayerId, slot: existingSlot.rosterPosition });
});

draftRouter.post("/lock", requireAuth, async (req: AuthedRequest, res) => {
  const schema = z.object({ teamId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const team = await db.query.teams.findFirst({ where: eq(teams.id, parsed.data.teamId) });
  if (!team || team.ownerId !== req.auth!.userId) return res.status(404).json({ error: "Team not found." });
  const [updated] = await db
    .update(teams)
    .set({ lockedAt: new Date() })
    .where(eq(teams.id, team.id))
    .returning();
  res.json(updated);
});
