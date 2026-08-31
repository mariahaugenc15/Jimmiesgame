import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import type { AuthedRequest } from "../middleware/requireAuth.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { AuthError, login, signup } from "./service.js";

export const authRouter = Router();

const signupSchema = z.object({
  username: z.string().min(3).max(24),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const result = await signup(parsed.data.username, parsed.data.email, parsed.data.password);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof AuthError) return res.status(409).json({ error: err.message });
    throw err;
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const result = await login(parsed.data.email, parsed.data.password);
    res.json(result);
  } catch (err) {
    if (err instanceof AuthError) return res.status(401).json({ error: err.message });
    throw err;
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.auth!.userId) });
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ id: user.id, username: user.username, email: user.email, skillRating: user.skillRating });
});
