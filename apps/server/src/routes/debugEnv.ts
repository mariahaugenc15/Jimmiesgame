import { Router } from "express";

export const debugEnvRouter = Router();

/**
 * Temporary diagnostic route: reports whether expected env vars are present
 * in the running process, without ever printing their values. Added to
 * chase a live "DATABASE_URL isn't reaching the server" bug that the
 * dashboard settings alone couldn't explain - remove once that's resolved.
 */
debugEnvRouter.get("/", (_req, res) => {
  res.json({
    hasDatabaseUrl: typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0,
    hasPostgresUrl: typeof process.env.POSTGRES_URL === "string" && process.env.POSTGRES_URL.length > 0,
    databaseUrlLength: process.env.DATABASE_URL?.length ?? 0,
    postgresUrlLength: process.env.POSTGRES_URL?.length ?? 0,
    nodeEnv: process.env.NODE_ENV ?? null,
    vercel: process.env.VERCEL ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
});
