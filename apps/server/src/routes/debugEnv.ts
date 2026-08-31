import { Router } from "express";
import { env } from "../env.js";

export const debugEnvRouter = Router();

/**
 * Temporary diagnostic route to chase a live CORS mismatch: CORS_ORIGIN is
 * confirmed correct in the Vercel dashboard, yet preflight requests are
 * still being rejected. corsOrigin isn't a secret (it's just a public
 * website address), so it's safe to echo directly here - wrapped in
 * brackets so any invisible leading/trailing whitespace or stray quote
 * characters pasted into the dashboard field become visible.
 * Remove this route once the mismatch is found.
 */
debugEnvRouter.get("/", (_req, res) => {
  res.json({
    corsOrigin: `[${env.corsOrigin}]`,
    corsOriginLength: env.corsOrigin.length,
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
});
