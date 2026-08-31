import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { env } from "../env.js";

export interface AuthTokenPayload {
  userId: string;
  username: string;
}

export class AuthError extends Error {}

export async function signup(username: string, email: string, password: string) {
  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.username, username)),
  });
  if (existing) {
    throw new AuthError("A user with that email or username already exists.");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({ username, email, passwordHash })
    .returning();
  return issueToken(user.id, user.username);
}

export async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) throw new AuthError("Invalid email or password.");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AuthError("Invalid email or password.");
  return issueToken(user.id, user.username);
}

function issueToken(userId: string, username: string) {
  const token = jwt.sign({ userId, username } satisfies AuthTokenPayload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
  return { token, userId, username };
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
