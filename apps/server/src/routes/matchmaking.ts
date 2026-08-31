import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { matches, users } from "../db/schema.js";
import { joinQueue, leaveQueue, queueSize } from "../matchmaking/queue.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const matchmakingRouter = Router();

const joinSchema = z.object({ teamId: z.string().uuid() });

matchmakingRouter.post("/join", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await db.query.users.findFirst({ where: eq(users.id, req.auth!.userId) });
  if (!user) return res.status(404).json({ error: "User not found." });

  const result = joinQueue({ userId: user.id, teamId: parsed.data.teamId, skillRating: user.skillRating });

  if ("waiting" in result) {
    return res.json({ status: "waiting", queueSize: queueSize() });
  }

  const [match] = await db
    .insert(matches)
    .values({ homeTeamId: result.matchedWith.teamId, awayTeamId: parsed.data.teamId, week: 1, status: "scheduled" })
    .returning();
  res.json({ status: "matched", match });
});

matchmakingRouter.post("/leave", requireAuth, async (req: AuthedRequest, res) => {
  leaveQueue(req.auth!.userId);
  res.json({ status: "left" });
});
