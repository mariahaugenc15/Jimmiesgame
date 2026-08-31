# Jimmies Game

Fantasy football head-to-head: draft a season-long roster of real active NFL
players, get weekly 0-99 in-game ratings computed from their real stats, then
play abstract head-to-head matches against anyone in the world.

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
pnpm --filter @jimmiesgame/server test   # rating engine, gameplay engine, draft logic
```

The rating engine and gameplay engine are pure, dependency-free function
sets — see `apps/server/src/rating-engine` and `apps/server/src/gameplay/engine.ts`
— covered by unit tests before anything touches the database or the network.

## Swappable real-stats provider

`apps/server/src/stats-provider` defines a `StatsProvider` interface with a
deterministic `MockStatsProvider` for local development (curated real
player list, seeded-random weekly stat lines). Point `STATS_PROVIDER` at a
real implementation (SportsDataIO, Sleeper, nflverse) later without touching
the rating engine or gameplay code.

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
