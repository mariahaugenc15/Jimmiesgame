import cors from "cors";
import express from "express";
// Patches Express 4's router so a rejected promise inside an async route
// handler reaches the error middleware below, instead of the request just
// hanging forever with no response (Express 4 doesn't do this on its own -
// fixed natively in Express 5, but this app is still on 4).
import "express-async-errors";
import { env } from "./env.js";
import { authRouter } from "./auth/routes.js";
import { draftRouter } from "./draft/routes.js";
import { teamsRouter } from "./routes/teams.js";
import { seasonsRouter } from "./routes/seasons.js";
import { playersRouter } from "./routes/players.js";
import { matchesRouter } from "./routes/matches.js";
import { matchmakingRouter } from "./routes/matchmaking.js";
import { leaguesRouter } from "./routes/leagues.js";
import { adminRouter } from "./routes/admin.js";
import { setupRouter } from "./routes/setup.js";
import { runWeeklySync, scheduleWeeklyRatingSync } from "./jobs/weeklyRatingSync.js";

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/setup", setupRouter);

app.use("/api/auth", authRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/seasons", seasonsRouter);
app.use("/api/players", playersRouter);
app.use("/api/drafts", draftRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/matchmaking", matchmakingRouter);
app.use("/api/leagues", leaguesRouter);
app.use("/api/admin", adminRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

// Catch-up sync on boot, so a fresh deploy has real ratings immediately
// instead of waiting for the next scheduled Tuesday run.
runWeeklySync().catch((err) => console.error("[weekly-sync] startup run failed:", err));
scheduleWeeklyRatingSync();
