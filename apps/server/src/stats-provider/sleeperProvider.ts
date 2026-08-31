import type { NFLPlayer, Position, WeeklyStatLine } from "@lockedin/shared";
import type { StatsProvider } from "./types.js";

const BASE_URL = "https://api.sleeper.app";
const PLAYERS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // Sleeper asks integrators not to hammer this endpoint

// --- Sleeper's raw shapes (subset of fields we use) -------------------------

interface SleeperPlayer {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string;
  fantasy_positions?: string[];
  team?: string | null;
  status?: string;
  number?: number;
}

type SleeperPlayersResponse = Record<string, SleeperPlayer>;

/** /v1/stats/nfl/regular/{season}/{week}: object keyed by player_id (or team abbreviation for DEF). */
type SleeperStatsResponse = Record<string, Record<string, number>>;

interface SleeperState {
  season: string;
  week: number;
  season_type: string;
}

const SLEEPER_TO_POSITION: Record<string, Position> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DEF: "DEF",
};

export function mapSleeperPlayer(raw: SleeperPlayer): NFLPlayer | null {
  const position = SLEEPER_TO_POSITION[raw.position ?? ""];
  if (!position) return null; // skip non-fantasy positions (OL, LB, DB, etc. show up in the raw feed)
  const name = raw.full_name ?? ([raw.first_name, raw.last_name].filter(Boolean).join(" ") || raw.player_id);
  return {
    id: raw.player_id,
    externalId: raw.player_id,
    name,
    position,
    realNflTeam: raw.team ?? "FA",
    jerseyNumber: raw.number,
  };
}

/**
 * Maps one player's raw Sleeper weekly-stats object to our WeeklyStatLine.
 * QB/RB/WR/TE field names (pass_att, rush_yd, rec, etc.) match Sleeper's
 * long-standing public schema with high confidence. The K and DEF fields
 * below are Sleeper's commonly-documented names but were NOT verified
 * against a live response while building this (this sandbox's network
 * egress policy blocks api.sleeper.app) — if kicker/defense ratings look
 * flat, log one raw response and confirm these keys first.
 */
export function mapSleeperStats(playerId: string, season: number, week: number, s: Record<string, number>): WeeklyStatLine {
  return {
    playerId,
    season,
    week,
    passAttempts: s.pass_att,
    passCompletions: s.pass_cmp,
    passYards: s.pass_yd,
    passTDs: s.pass_td,
    interceptions: s.pass_int,
    rushAttempts: s.rush_att,
    rushYards: s.rush_yd,
    rushTDs: s.rush_td,
    targets: s.rec_tgt,
    receptions: s.rec,
    receivingYards: s.rec_yd,
    receivingTDs: s.rec_td,
    fumblesLost: s.fum_lost,
    // --- lower confidence: kicker ---
    fieldGoalsMade: s.fgm,
    fieldGoalsAttempted: s.fga,
    longestFieldGoal: s.fgm_long,
    extraPointsMade: s.xpm,
    // --- lower confidence: team defense ---
    tackles: s.tackle_solo !== undefined ? s.tackle_solo + (s.tackle_ast ?? 0) : undefined,
    sacks: s.sack,
    interceptionsForced: s.int,
    fumbleRecoveries: s.fum_rec,
    defensiveTDs: s.def_td,
    pointsAllowed: s.pts_allow,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sleeper request failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json() as Promise<T>;
}

export class SleeperStatsProvider implements StatsProvider {
  private playersCache: { players: NFLPlayer[]; fetchedAt: number } | null = null;
  private playersInFlight: Promise<NFLPlayer[]> | null = null;

  async listActivePlayers(): Promise<NFLPlayer[]> {
    const now = Date.now();
    if (this.playersCache && now - this.playersCache.fetchedAt < PLAYERS_CACHE_TTL_MS) {
      return this.playersCache.players;
    }
    if (this.playersInFlight) return this.playersInFlight;

    this.playersInFlight = (async () => {
      const raw = await fetchJson<SleeperPlayersResponse>(`${BASE_URL}/v1/players/nfl`);
      const players = Object.values(raw)
        .map(mapSleeperPlayer)
        .filter((p): p is NFLPlayer => p !== null);
      this.playersCache = { players, fetchedAt: Date.now() };
      this.playersInFlight = null;
      return players;
    })();

    return this.playersInFlight;
  }

  async getWeeklyStats(season: number, week: number): Promise<WeeklyStatLine[]> {
    const raw = await fetchJson<SleeperStatsResponse>(`${BASE_URL}/stats/nfl/regular/${season}/${week}`);
    return Object.entries(raw).map(([playerId, stats]) => mapSleeperStats(playerId, season, week, stats));
  }

  async getPlayerWeeklyStats(playerExternalId: string, season: number, week: number): Promise<WeeklyStatLine | null> {
    const all = await this.getWeeklyStats(season, week);
    return all.find((s) => s.playerId === playerExternalId) ?? null;
  }

  async getCurrentWeek(): Promise<{ season: number; week: number } | null> {
    const state = await fetchJson<SleeperState>(`${BASE_URL}/v1/state/nfl`);
    if (state.season_type !== "regular") return null; // preseason/postseason: let the DB-based fallback decide
    return { season: Number(state.season), week: state.week };
  }
}
