/**
 * The initial schema, as one idempotent SQL script embedded directly in the
 * compiled JS (instead of read from apps/server/drizzle/ at runtime).
 *
 * Why: drizzle's file-based migrator needs the drizzle/ folder (SQL file +
 * meta/_journal.json) to exist on disk at runtime. Vercel's zero-config
 * Express hosting bundles a serverless function by statically tracing
 * imports/requires from the entry file, so it can't tell that migrate()
 * reads that folder via a runtime string path - the folder was silently
 * left out of the deployed bundle. Embedding the SQL as a string constant
 * sidesteps that: it's compiled straight into dist/index.js, so there's no
 * separate file for Vercel's bundler to miss.
 *
 * This mirrors apps/server/drizzle/0000_tranquil_glorian.sql exactly,
 * except CREATE TYPE is wrapped the same idempotent DO $$ / duplicate_object
 * way the generated FK constraints already are (Postgres has no
 * "CREATE TYPE IF NOT EXISTS"), so this whole script is safe to run more
 * than once against the same database - matching how /setup calls it.
 */
export const SCHEMA_SQL = `
DO $$ BEGIN
  CREATE TYPE "public"."draft_type" AS ENUM('snake', 'auction');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'in_progress', 'completed', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."position" AS ENUM('QB', 'RB', 'WR', 'TE', 'DEF', 'K');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."roster_slot" AS ENUM('QB', 'RB', 'WR', 'TE', 'FLEX', 'DEF', 'K', 'BENCH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"type" "draft_type" DEFAULT 'snake' NOT NULL,
	"is_solo" boolean DEFAULT false NOT NULL,
	"participant_team_ids" jsonb NOT NULL,
	"picks" jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "league_members" (
	"league_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	CONSTRAINT "league_members_league_id_team_id_pk" PRIMARY KEY("league_id","team_id")
);

CREATE TABLE IF NOT EXISTS "leagues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"is_private" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer DEFAULT 0 NOT NULL,
	"away_score" integer DEFAULT 0 NOT NULL,
	"replay_log" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "nfl_players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"real_nfl_team" text NOT NULL,
	"position" "position" NOT NULL,
	"external_id" text NOT NULL,
	"jersey_number" integer
);

CREATE TABLE IF NOT EXISTS "player_ratings" (
	"player_id" text NOT NULL,
	"season" integer NOT NULL,
	"week" integer NOT NULL,
	"speed" integer NOT NULL,
	"power" integer NOT NULL,
	"accuracy" integer NOT NULL,
	"catching" integer NOT NULL,
	"awareness" integer NOT NULL,
	"stamina" integer NOT NULL,
	"overall" integer NOT NULL,
	CONSTRAINT "player_ratings_player_id_season_week_pk" PRIMARY KEY("player_id","season","week")
);

CREATE TABLE IF NOT EXISTS "roster_slots" (
	"team_id" uuid NOT NULL,
	"nfl_player_id" text NOT NULL,
	"roster_position" "roster_slot" NOT NULL,
	"draft_round" integer NOT NULL,
	CONSTRAINT "roster_slots_team_id_nfl_player_id_pk" PRIMARY KEY("team_id","nfl_player_id")
);

CREATE TABLE IF NOT EXISTS "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"draft_lock_date" timestamp with time zone NOT NULL,
	"current_week" integer DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"season_id" uuid NOT NULL,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"skill_rating" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "weekly_stats" (
	"player_id" text NOT NULL,
	"season" integer NOT NULL,
	"week" integer NOT NULL,
	"stats" jsonb NOT NULL,
	CONSTRAINT "weekly_stats_player_id_season_week_pk" PRIMARY KEY("player_id","season","week")
);

DO $$ BEGIN
 ALTER TABLE "drafts" ADD CONSTRAINT "drafts_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "league_members" ADD CONSTRAINT "league_members_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "league_members" ADD CONSTRAINT "league_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "leagues" ADD CONSTRAINT "leagues_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_player_id_nfl_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."nfl_players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "roster_slots" ADD CONSTRAINT "roster_slots_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "roster_slots" ADD CONSTRAINT "roster_slots_nfl_player_id_nfl_players_id_fk" FOREIGN KEY ("nfl_player_id") REFERENCES "public"."nfl_players"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "weekly_stats" ADD CONSTRAINT "weekly_stats_player_id_nfl_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."nfl_players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "nfl_players_external_idx" ON "nfl_players" USING btree ("external_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");
`;
