import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const positionEnum = pgEnum("position", ["QB", "RB", "WR", "TE", "DEF", "K"]);
export const rosterSlotEnum = pgEnum("roster_slot", [
  "QB",
  "RB",
  "WR",
  "TE",
  "FLEX",
  "DEF",
  "K",
  "BENCH",
]);
export const draftTypeEnum = pgEnum("draft_type", ["snake", "auction"]);
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "in_progress",
  "completed",
  "abandoned",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  skillRating: integer("skill_rating").notNull().default(1000),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
  usernameIdx: uniqueIndex("users_username_idx").on(table.username),
}));

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  year: integer("year").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  draftLockDate: timestamp("draft_lock_date", { withTimezone: true }).notNull(),
  currentWeek: integer("current_week").notNull().default(1),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // A shape keyword (see TEAM_ICON_SHAPES) or an emoji glyph, chosen right
  // before a match starts - null until the owner has picked one.
  icon: text("icon"),
});

export const nflPlayers = pgTable("nfl_players", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  realNflTeam: text("real_nfl_team").notNull(),
  position: positionEnum("position").notNull(),
  externalId: text("external_id").notNull(),
  jerseyNumber: integer("jersey_number"),
}, (table) => ({
  externalIdx: uniqueIndex("nfl_players_external_idx").on(table.externalId),
}));

export const rosterSlots = pgTable("roster_slots", {
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  nflPlayerId: text("nfl_player_id").notNull().references(() => nflPlayers.id, { onDelete: "restrict" }),
  rosterPosition: rosterSlotEnum("roster_position").notNull(),
  draftRound: integer("draft_round").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.teamId, table.nflPlayerId] }),
}));

export const weeklyStats = pgTable("weekly_stats", {
  playerId: text("player_id").notNull().references(() => nflPlayers.id, { onDelete: "cascade" }),
  season: integer("season").notNull(),
  week: integer("week").notNull(),
  stats: jsonb("stats").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.season, table.week] }),
}));

export const playerRatings = pgTable("player_ratings", {
  playerId: text("player_id").notNull().references(() => nflPlayers.id, { onDelete: "cascade" }),
  season: integer("season").notNull(),
  week: integer("week").notNull(),
  speed: integer("speed").notNull(),
  power: integer("power").notNull(),
  accuracy: integer("accuracy").notNull(),
  catching: integer("catching").notNull(),
  awareness: integer("awareness").notNull(),
  stamina: integer("stamina").notNull(),
  overall: integer("overall").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.playerId, table.season, table.week] }),
}));

export const drafts = pgTable("drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  type: draftTypeEnum("type").notNull().default("snake"),
  isSolo: boolean("is_solo").notNull().default(false),
  participantTeamIds: jsonb("participant_team_ids").notNull().$type<string[]>(),
  picks: jsonb("picks").notNull().$type<unknown[]>(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  homeTeamId: uuid("home_team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  awayTeamId: uuid("away_team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  week: integer("week").notNull(),
  status: matchStatusEnum("status").notNull().default("scheduled"),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  replayLog: jsonb("replay_log").$type<unknown[]>(),
  // Persists the live gameplay engine's runtime state (game clock, down,
  // pending play calls, etc). Read/written on every play call instead of
  // kept in an in-memory Map, since serverless requests can't rely on
  // hitting the same running process twice in a row.
  liveState: jsonb("live_state").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPrivate: boolean("is_private").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leagueMembers = pgTable("league_members", {
  leagueId: uuid("league_id").notNull().references(() => leagues.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey({ columns: [table.leagueId, table.teamId] }),
}));
