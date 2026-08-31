# Locked In

Fantasy football head-to-head: draft a season-long roster of real active NFL
players, get weekly 0-99 in-game ratings computed from their real stats, then
play abstract head-to-head matches against anyone in the world.

The name is the mechanic: you draft your roster once, lock it in, and live
with that decision for the whole season.

Gameplay is deliberately abstract — formation diagrams, directional arrows,
stat-weighted probability bars — not a simulation-style Madden clone. See
`apps/server/src/gameplay` for the engine and `apps/web/src/components/FieldView.tsx`
for the visualization.

## Monorepo layout

```
apps/web       React + TypeScript + Vite + Tailwind, installable PWA
apps/server    Node + TypeScript + Express + Socket.IO (authoritative game server)
packages/shared  Shared TypeScript types (Player, Team, Match, gameplay types, roster rules)
```

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable` or `npm i -g pnpm`)
- PostgreSQL (a `docker-compose.yml` is provided for local Postgres + Redis)

## Setup

```bash
pnpm install

# start local Postgres + Redis
docker compose up -d

# configure env
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env

# create schema and seed a curated player pool + season
pnpm run db:migrate
pnpm run db:seed

# run both apps
pnpm run dev:server   # http://localhost:4000
pnpm run dev:web      # http://localhost:5173
```

## Testing the app

1. Sign up, create a team.
2. **Run Solo Draft** on the Dashboard — instantly fills your roster and 5 bot
   teams from a shared player pool (best-player-available snake draft).
3. Check **Roster** — swap any player for the next-best available at that
   position, then **Lock roster** to simulate the season-start lock.
4. From the Dashboard, **Play against a bot** to start a live match, or
   **Find a global opponent** to join the ELO-based matchmaking queue.
5. Call plays; the server resolves each snap from both rosters' ratings and
   broadcasts the result over WebSockets in real time.
6. **Leagues** page: create/join a private league, view standings, and see
   the global skill-rating leaderboard.

Everything above works at both desktop and mobile viewport widths (bottom
tab bar under `sm`).

## Tests

```bash
pnpm --filter @lockedin/server test   # rating engine, gameplay engine, draft logic
```

The rating engine and gameplay engine are pure, dependency-free function
sets — see `apps/server/src/rating-engine` and `apps/server/src/gameplay/engine.ts`
— covered by unit tests before anything touches the database or the network.

## Real stats, weekly ratings, and the sync job

`apps/server/src/stats-provider` defines a `StatsProvider` interface with two
implementations, selected via `STATS_PROVIDER`:

- `mock` (default) — deterministic seeded-random weekly stat lines, no
  network. Safe fallback for local dev or any environment without outbound
  internet access.
- `sleeper` — real player data and weekly stats from Sleeper's free, keyless
  public API (`api.sleeper.app`). **The QB/RB/WR/TE field mapping matches
  Sleeper's long-standing schema with high confidence; the kicker and team
  defense field names in `sleeperProvider.ts` were written from best
  available knowledge but could not be verified against a live response
  while building this** (this dev sandbox's network egress policy blocks
  `api.sleeper.app`). Before relying on K/DEF ratings in production, log one
  raw `/stats/nfl/regular/{season}/{week}` response and confirm those keys.

`apps/server/src/rating-engine/sync.ts` (`syncWeeklyRatings`) is the one
place real stats become stored ratings: it upserts the provider's player
list into `nfl_players`, pulls one week's stat lines into `weekly_stats`,
computes 0-99 ratings via the rating engine, and upserts those into
`player_ratings`. `apps/server/src/jobs/weeklyRatingSync.ts` runs that job
automatically:

- once at server startup (so a fresh boot has real ratings immediately,
  not just after the first scheduled run),
- every Tuesday morning via `node-cron` (after Monday Night Football has
  finalized stats), advancing `season.currentWeek` to whatever the provider
  reports as the real current NFL week (Sleeper's `/v1/state/nfl`) when
  that's available,
- or on demand via `POST /api/admin/sync-ratings`, for testing without
  waiting for Tuesday.

`GET /api/players`, the solo-draft roster fill, and live-match team
profiles all read persisted `player_ratings` for the season's current week
first, falling back to computing on the fly only for a week the sync job
hasn't run for yet (e.g. the very first request after a fresh migration).

## Known simplifications (v1)

- Fantasy rosters have no offensive linemen or individual defenders; DEF/ST
  is one drafted unit (as in real fantasy scoring), and pass protection/rush
  are proxied from overall roster quality rather than simulated trench play.
- No field goal attempts in the abstract game loop yet (kickers are drafted
  and rated, but possessions currently resolve only as touchdown, turnover,
  or turnover-on-downs).
- Matchmaking queue and live match state are in-memory per server process;
  production would move both to Redis for multi-instance scaling (the code
  is structured so that's a storage swap, not a logic rewrite).
- The live multiplayer draft room (many humans in one snake draft) is not
  built yet — solo mode (best-player-available vs. bots) is complete and is
  the fastest path to a playable team today.
- The app assumes one active season at a time (the most recently created
  row in `seasons`); multi-season support would need that threaded through
  explicitly instead of always picking "the latest."
