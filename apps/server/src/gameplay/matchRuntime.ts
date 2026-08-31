import { eq } from "drizzle-orm";
import type { DefensivePlay, GameState, OffensivePlay, PlayResult } from "@lockedin/shared";
import { db } from "../db/client.js";
import { matches, rosterSlots, seasons, teams } from "../db/schema.js";
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

/**
 * The engine's live runtime state, persisted to matches.live_state instead
 * of kept in an in-memory Map. A single Node process can't be assumed to
 * handle two requests for the same match in a row (serverless hosting may
 * run each one in a different instance), so every read and write goes
 * through the database. Team offense/defense profiles are recomputed from
 * the roster on each resolved play rather than cached, trading a bit of
 * per-play latency for not having to persist or invalidate them.
 */
interface PersistedRuntime {
  state: GameState;
  botTeamIds: string[];
  pending: PendingCalls;
}

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
  let state = createInitialGameState(matchId, homeTeamId, awayTeamId);
  const receivingTeamId = Math.random() < 0.5 ? homeTeamId : awayTeamId;
  state = startFirstDrive(state, receivingTeamId);

  const runtime: PersistedRuntime = { state, botTeamIds, pending: {} };
  await db.update(matches).set({ liveState: runtime }).where(eq(matches.id, matchId));

  return state;
}

export async function getMatchState(matchId: string): Promise<GameState | undefined> {
  const match = await db.query.matches.findFirst({ where: eq(matches.id, matchId) });
  const runtime = match?.liveState as PersistedRuntime | null | undefined;
  return runtime?.state;
}

function offenseAndDefenseTeamIds(state: GameState): { offenseTeamId: string; defenseTeamId: string } {
  const offenseTeamId = state.possessionTeamId!;
  const defenseTeamId = offenseTeamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
  return { offenseTeamId, defenseTeamId };
}

function maybeFillBotCalls(runtime: PersistedRuntime) {
  const { offenseTeamId, defenseTeamId } = offenseAndDefenseTeamIds(runtime.state);
  if (runtime.botTeamIds.includes(offenseTeamId) && !runtime.pending.offensivePlay) {
    runtime.pending.offensivePlay = botChooseOffensivePlay(runtime.state.down!);
  }
  if (runtime.botTeamIds.includes(defenseTeamId) && !runtime.pending.defensivePlay) {
    runtime.pending.defensivePlay = botChooseDefensivePlay(runtime.state.down!);
  }
}

export interface PlayCallResult {
  resolved: boolean;
  state: GameState;
  playResult?: PlayResult;
  gameOver?: boolean;
}

/**
 * Records one side's playcall; once both offense and defense calls are in,
 * resolves the snap. Runs inside a transaction with the match row locked
 * (SELECT ... FOR UPDATE) so two near-simultaneous submissions from the two
 * real players in a match can't race each other into reading the same
 * "only one side has called a play yet" state and both writing a partial
 * update - the second submission waits for the first to commit, then reads
 * the up-to-date pending calls.
 */
export async function submitPlayCall(
  matchId: string,
  teamId: string,
  play: OffensivePlay | DefensivePlay,
): Promise<PlayCallResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(matches).where(eq(matches.id, matchId)).for("update");
    const runtime = row?.liveState as PersistedRuntime | null | undefined;
    if (!runtime) throw new Error("Match not found or not started.");
    if (runtime.state.phase !== "in_progress" || !runtime.state.down) {
      throw new Error("Match is not currently accepting play calls.");
    }

    const { offenseTeamId, defenseTeamId } = offenseAndDefenseTeamIds(runtime.state);
    if (teamId === offenseTeamId) {
      runtime.pending.offensivePlay = play as OffensivePlay;
    } else if (teamId === defenseTeamId) {
      runtime.pending.defensivePlay = play as DefensivePlay;
    } else {
      throw new Error("Team is not part of this match.");
    }

    maybeFillBotCalls(runtime);

    if (!runtime.pending.offensivePlay || !runtime.pending.defensivePlay) {
      await tx.update(matches).set({ liveState: runtime }).where(eq(matches.id, matchId));
      return { resolved: false, state: runtime.state };
    }

    const [offenseProfile, defenseProfile] = await Promise.all([
      loadTeamProfile(offenseTeamId),
      loadTeamProfile(defenseTeamId),
    ]);

    const playResult = resolvePlay({
      offensivePlay: runtime.pending.offensivePlay,
      defensivePlay: runtime.pending.defensivePlay,
      offense: offenseProfile.offense,
      defense: defenseProfile.defense,
    });

    runtime.state = applyPlayToGame(runtime.state, playResult);
    runtime.pending = {};

    const gameOver = isGameOver(runtime.state);

    await tx
      .update(matches)
      .set(
        gameOver
          ? {
              liveState: runtime,
              status: "completed",
              homeScore: runtime.state.homeScore,
              awayScore: runtime.state.awayScore,
              completedAt: new Date(),
            }
          : { liveState: runtime },
      )
      .where(eq(matches.id, matchId));

    return { resolved: true, state: runtime.state, playResult, gameOver };
  });
}
