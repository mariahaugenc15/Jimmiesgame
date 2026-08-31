import { eq } from "drizzle-orm";
import type { DefensivePlay, GameState, OffensivePlay, PlayResult } from "@lockedin/shared";
import { db } from "../db/client.js";
import { rosterSlots, seasons, teams } from "../db/schema.js";
import { getRatingsForWeek } from "../db/ratingsRepo.js";
import { computeRatingFromStats } from "../rating-engine/index.js";
import { statsProvider } from "../stats-provider/index.js";
import { applyPlayToGame, createInitialGameState, isGameOver, resolvePlay, startFirstDrive } from "./engine.js";
import type { DefenseProfile, OffenseProfile } from "./engine.js";
import { botChooseDefensivePlay, botChooseOffensivePlay } from "./botAI.js";
import { buildDefenseProfile, buildOffenseProfile, type RosteredPlayer } from "./teamProfile.js";

interface PendingCalls {
  offensivePlay?: OffensivePlay;
  defensivePlay?: DefensivePlay;
}

interface MatchRuntimeEntry {
  state: GameState;
  botTeamIds: Set<string>;
  profiles: Map<string, { offense: OffenseProfile; defense: DefenseProfile }>;
  pending: PendingCalls;
}

const runtimeMatches = new Map<string, MatchRuntimeEntry>();

async function loadTeamProfile(teamId: string): Promise<{ offense: OffenseProfile; defense: DefenseProfile }> {
  const slots = await db.query.rosterSlots.findMany({ where: eq(rosterSlots.teamId, teamId) });
  const players = await db.query.nflPlayers.findMany();
  const playerById = new Map(players.map((p) => [p.id, p]));

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  const season = team ? await db.query.seasons.findFirst({ where: eq(seasons.id, team.seasonId) }) : undefined;
  const year = season?.year ?? new Date().getFullYear();
  const week = season?.currentWeek ?? 1;

  const persisted = await getRatingsForWeek(year, week);
  const statsById =
    persisted.size > 0 ? null : new Map((await statsProvider.getWeeklyStats(year, week)).map((s) => [s.playerId, s]));

  const rostered: RosteredPlayer[] = slots.map((slot) => {
    const player = playerById.get(slot.nflPlayerId);
    const persistedRating = persisted.get(slot.nflPlayerId);
    const stats = statsById?.get(slot.nflPlayerId);
    const rating = persistedRating ?? (player && stats ? computeRatingFromStats(player.position, stats) : null);
    return {
      nflPlayerId: slot.nflPlayerId,
      position: player?.position ?? "WR",
      rosterPosition: slot.rosterPosition,
      rating,
    };
  });

  return { offense: buildOffenseProfile(rostered), defense: buildDefenseProfile(rostered) };
}

export async function startMatch(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  botTeamIds: string[] = [],
): Promise<GameState> {
  const [homeProfile, awayProfile] = await Promise.all([
    loadTeamProfile(homeTeamId),
    loadTeamProfile(awayTeamId),
  ]);

  let state = createInitialGameState(matchId, homeTeamId, awayTeamId);
  const receivingTeamId = Math.random() < 0.5 ? homeTeamId : awayTeamId;
  state = startFirstDrive(state, receivingTeamId);

  runtimeMatches.set(matchId, {
    state,
    botTeamIds: new Set(botTeamIds),
    profiles: new Map([
      [homeTeamId, homeProfile],
      [awayTeamId, awayProfile],
    ]),
    pending: {},
  });

  return state;
}

export function getMatchState(matchId: string): GameState | undefined {
  return runtimeMatches.get(matchId)?.state;
}

function offenseAndDefenseTeamIds(state: GameState): { offenseTeamId: string; defenseTeamId: string } {
  const offenseTeamId = state.possessionTeamId!;
  const defenseTeamId = offenseTeamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  return { offenseTeamId, defenseTeamId };
}

function maybeFillBotCalls(entry: MatchRuntimeEntry) {
  const { offenseTeamId, defenseTeamId } = offenseAndDefenseTeamIds(entry.state);
  if (entry.botTeamIds.has(offenseTeamId) && !entry.pending.offensivePlay) {
    entry.pending.offensivePlay = botChooseOffensivePlay(entry.state.down!);
  }
  if (entry.botTeamIds.has(defenseTeamId) && !entry.pending.defensivePlay) {
    entry.pending.defensivePlay = botChooseDefensivePlay(entry.state.down!);
  }
}

export interface PlayCallResult {
  resolved: boolean;
  state: GameState;
  playResult?: PlayResult;
  gameOver?: boolean;
}

/** Records one side's playcall; once both offense and defense calls are in, resolves the snap. */
export function submitPlayCall(
  matchId: string,
  teamId: string,
  play: OffensivePlay | DefensivePlay,
): PlayCallResult {
  const entry = runtimeMatches.get(matchId);
  if (!entry) throw new Error("Match not found or not started.");
  if (entry.state.phase !== "in_progress" || !entry.state.down) {
    throw new Error("Match is not currently accepting play calls.");
  }

  const { offenseTeamId, defenseTeamId } = offenseAndDefenseTeamIds(entry.state);
  if (teamId === offenseTeamId) {
    entry.pending.offensivePlay = play as OffensivePlay;
  } else if (teamId === defenseTeamId) {
    entry.pending.defensivePlay = play as DefensivePlay;
  } else {
    throw new Error("Team is not part of this match.");
  }

  maybeFillBotCalls(entry);

  if (!entry.pending.offensivePlay || !entry.pending.defensivePlay) {
    return { resolved: false, state: entry.state };
  }

  const offenseProfile = entry.profiles.get(offenseTeamId)!.offense;
  const defenseProfile = entry.profiles.get(defenseTeamId)!.defense;

  const playResult = resolvePlay({
    offensivePlay: entry.pending.offensivePlay,
    defensivePlay: entry.pending.defensivePlay,
    offense: offenseProfile,
    defense: defenseProfile,
  });

  entry.state = applyPlayToGame(entry.state, playResult);
  entry.pending = {};

  const gameOver = isGameOver(entry.state);
  return { resolved: true, state: entry.state, playResult, gameOver };
}
