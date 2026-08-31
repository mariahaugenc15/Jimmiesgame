import { Router } from "express";
import { runInitialSetup } from "../db/initialSetup.js";

export const setupRouter = Router();

/**
 * Visit this in a browser once after connecting a fresh database in
 * production: creates the schema and loads the NFL player pool + a season.
 * No auth on purpose - every operation here is idempotent (safe to run more
 * than once) and only touches shared reference data, never user accounts,
 * so this is left simple rather than adding another credential to manage.
 * Remove this route (and its mount in index.ts) once you're comfortable
 * everything's set up, if you'd rather not leave it reachable long-term.
 */
setupRouter.get("/", async (_req, res) => {
  try {
    const result = await runInitialSetup();
    res.send(`<!doctype html>
<html>
<head><title>Setup complete</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 80px auto; padding: 0 20px; color: #0f172a;">
  <h1 style="color: #16a34a;">Setup complete ✅</h1>
  <p>Database tables are ready, and ${result.playersSeeded} NFL players are loaded.</p>
  <p>${result.seasonCreated ? `Season ${result.seasonYear} was created.` : `Season ${result.seasonYear} already existed - nothing changed there.`}</p>
  <p>You're all set. Go to the app and sign up for an account.</p>
</body>
</html>`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).send(`<!doctype html>
<html>
<head><title>Setup failed</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 80px auto; padding: 0 20px; color: #0f172a;">
  <h1 style="color: #dc2626;">Setup failed ❌</h1>
  <p>Send this back to Claude:</p>
  <pre style="white-space: pre-wrap; background: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 13px;">${message}</pre>
</body>
</html>`);
  }
});
