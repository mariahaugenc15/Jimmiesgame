import type {
  ClockState,
  DefensivePlay,
  DownState,
  GameState,
  OffensivePlay,
  PlayResult,
} from "@lockedin/shared";

export interface OffenseProfile {
  qbAccuracy: number;
  qbAwareness: number;
  rbSpeed: number;
  rbPower: number;
  wrCatching: number;
  wrSpeed: number;
  olPower: number;
}

export interface DefenseProfile {
  passRush: number;
  coverage: number;
  runStop: number;
  takeawayAwareness: number;
}

export interface ResolvePlayInput {
  offensivePlay: OffensivePlay;
  defensivePlay: DefensivePlay;
  offense: OffenseProfile;
  defense: DefenseProfile;
  ballCarrierId?: string;
  targetId?: string;
  rand?: () => number;
}

/** Probability delta applied when an offensive playcall is countered/favored by a defensive scheme. */
const MATCHUP_MODIFIER: Record<OffensivePlay, Partial<Record<DefensivePlay, number>>> = {
  inside_run: { run_stack: -0.15, blitz: 0.05, man_coverage: 0.1, zone_coverage: 0.05, prevent: 0.2 },
  outside_run: { run_stack: -0.05, blitz: 0.15, man_coverage: 0.05, zone_coverage: 0, prevent: 0.15 },
  short_pass: { zone_coverage: -0.1, man_coverage: 0.05, blitz: 0.1, run_stack: 0.15, prevent: -0.2 },
  deep_pass: { man_coverage: -0.1, zone_coverage: -0.05, blitz: 0.1, run_stack: 0.2, prevent: -0.25 },
  play_action: { run_stack: 0.2, blitz: 0.1, man_coverage: -0.05, zone_coverage: -0.1, prevent: -0.15 },
  screen_pass: { blitz: 0.25, man_coverage: -0.05, zone_coverage: -0.1, run_stack: 0, prevent: -0.1 },
};

const IS_RUN_PLAY: Record<OffensivePlay, boolean> = {
  inside_run: true,
  outside_run: true,
  short_pass: false,
  deep_pass: false,
  play_action: true,
  screen_pass: false,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Resolves one snap into a play outcome. Pure aside from the injected RNG (defaults to Math.random). */
export function resolvePlay(input: ResolvePlayInput): PlayResult {
  const rand = input.rand ?? Math.random;
  const { offensivePlay, defensivePlay, offense, defense } = input;
  const modifier = MATCHUP_MODIFIER[offensivePlay][defensivePlay] ?? 0;
  const isRun = IS_RUN_PLAY[offensivePlay];

  if (!isRun) {
    const sackChance = clamp((defense.passRush - offense.olPower) / 300 + 0.06, 0.02, 0.35);
    if (rand() < sackChance) {
      return {
        type: "sack",
        yards: -Math.round(3 + rand() * 5),
        offensivePlay,
        defensivePlay,
        breakawayChance: 0,
        successProbability: 1 - sackChance,
      };
    }

    const offenseSkill = offensivePlay === "screen_pass" ? offense.rbPower : offense.qbAccuracy;
    const successProbability = clamp(0.5 + (offenseSkill - defense.coverage) / 200 + modifier, 0.05, 0.95);
    const completed = rand() < successProbability;

    if (!completed) {
      const interceptionChance = clamp((defense.takeawayAwareness - offense.qbAwareness) / 400 + 0.04, 0.01, 0.2);
      if (rand() < interceptionChance) {
        return {
          type: "interception",
          yards: 0,
          offensivePlay,
          defensivePlay,
          targetId: input.targetId,
          breakawayChance: 0,
          successProbability,
        };
      }
      return {
        type: "incomplete",
        yards: 0,
        offensivePlay,
        defensivePlay,
        targetId: input.targetId,
        breakawayChance: 0,
        successProbability,
      };
    }

    const baseYards = offensivePlay === "deep_pass" ? 18 : offensivePlay === "screen_pass" ? 6 : 9;
    const breakawayChance = clamp((offense.wrSpeed - defense.coverage) / 150 + 0.1, 0.02, 0.4);
    const breakaway = rand() < breakawayChance;
    const yards = Math.round(baseYards + rand() * 8 + (breakaway ? 15 + rand() * 30 : 0));
    return {
      type: "gain",
      yards,
      offensivePlay,
      defensivePlay,
      ballCarrierId: input.targetId,
      targetId: input.targetId,
      breakawayChance,
      successProbability,
    };
  }

  const offenseSkill = (offense.rbPower + offense.olPower) / 2;
  const successProbability = clamp(0.5 + (offenseSkill - defense.runStop) / 200 + modifier, 0.05, 0.95);
  const stuffed = rand() > successProbability;

  const fumbleChance = clamp((defense.takeawayAwareness - offense.rbSpeed) / 500 + 0.015, 0.005, 0.08);
  if (rand() < fumbleChance) {
    return {
      type: "fumble",
      yards: stuffed ? 0 : Math.round(rand() * 3),
      offensivePlay,
      defensivePlay,
      ballCarrierId: input.ballCarrierId,
      breakawayChance: 0,
      successProbability,
    };
  }

  const breakawayChance = clamp((offense.rbSpeed - defense.runStop) / 150 + 0.08, 0.02, 0.35);
  const breakaway = !stuffed && rand() < breakawayChance;
  const baseYards = stuffed ? -1 + rand() * 2 : 2 + rand() * 5;
  const yards = Math.round(baseYards + (breakaway ? 15 + rand() * 40 : 0));
  return {
    type: "gain",
    yards,
    offensivePlay,
    defensivePlay,
    ballCarrierId: input.ballCarrierId,
    breakawayChance,
    successProbability,
  };
}

const QUARTER_SECONDS = 15 * 60;
const PLAY_CLOCK_RUNOFF = { stopped: 6, running: 38 };

export function createInitialGameState(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
): GameState {
  return {
    matchId,
    phase: "coin_toss",
    clock: { quarter: 1, secondsRemaining: QUARTER_SECONDS },
    down: null,
    homeTeamId,
    awayTeamId,
    homeScore: 0,
    awayScore: 0,
    possessionTeamId: null,
    lastPlay: null,
    driveNumber: 0,
    log: [],
  };
}

export function startFirstDrive(state: GameState, receivingTeamId: string): GameState {
  return {
    ...state,
    phase: "in_progress",
    possessionTeamId: receivingTeamId,
    driveNumber: 1,
    down: { down: 1, yardsToGo: 10, yardLine: 25, possessionTeamId: receivingTeamId },
    log: [...state.log, `Drive 1: ${receivingTeamId} start at their own 25.`],
  };
}

function otherTeam(state: GameState, teamId: string): string {
  return teamId === state.homeTeamId ? state.awayTeamId : state.homeTeamId;
}

function advanceClock(clock: ClockState, secondsUsed: number): { clock: ClockState; quarterEnded: boolean } {
  const remaining = clock.secondsRemaining - secondsUsed;
  if (remaining > 0) {
    return { clock: { ...clock, secondsRemaining: remaining }, quarterEnded: false };
  }
  if (clock.quarter === 4) {
    return { clock: { quarter: 4, secondsRemaining: 0 }, quarterEnded: true };
  }
  const nextQuarter = (clock.quarter === "OT" ? "OT" : ((clock.quarter + 1) as ClockState["quarter"]));
  return { clock: { quarter: nextQuarter, secondsRemaining: QUARTER_SECONDS }, quarterEnded: true };
}

/** Applies a resolved play to game state: downs, yardage, scoring, clock, possession changes. */
export function applyPlayToGame(state: GameState, play: PlayResult): GameState {
  if (!state.down || !state.possessionTeamId) {
    throw new Error("Cannot apply a play with no active down/possession.");
  }
  const down = state.down;
  const log = [...state.log];
  const secondsUsed =
    play.type === "incomplete" || play.type === "touchdown" ? PLAY_CLOCK_RUNOFF.stopped : PLAY_CLOCK_RUNOFF.running;
  const { clock, quarterEnded } = advanceClock(state.clock, secondsUsed);

  if (play.type === "interception" || play.type === "fumble") {
    const newPossession = otherTeam(state, state.possessionTeamId);
    log.push(`Turnover! ${play.type} on the ${down.yardLine}-yard line.`);
    const finalState: GameState = {
      ...state,
      clock,
      lastPlay: play,
      possessionTeamId: newPossession,
      driveNumber: state.driveNumber + 1,
      down: { down: 1, yardsToGo: 10, yardLine: 100 - down.yardLine, possessionTeamId: newPossession },
      log,
    };
    return quarterEnded ? handleQuarterEnd(finalState) : finalState;
  }

  const newYardLine = clamp(down.yardLine + play.yards, 0, 100);

  if (newYardLine >= 100) {
    const scoringTeamId = state.possessionTeamId;
    const homeScore = state.homeScore + (scoringTeamId === state.homeTeamId ? 7 : 0);
    const awayScore = state.awayScore + (scoringTeamId === state.awayTeamId ? 7 : 0);
    const receivingTeamId = otherTeam(state, scoringTeamId);
    log.push(`Touchdown, ${scoringTeamId}!`);
    if (state.clock.quarter === "OT") {
      return {
        ...state,
        clock,
        lastPlay: { ...play, type: "touchdown" },
        homeScore,
        awayScore,
        phase: "final",
        log: [...log, "Sudden death: game over."],
      };
    }
    const finalState: GameState = {
      ...state,
      clock,
      lastPlay: { ...play, type: "touchdown" },
      homeScore,
      awayScore,
      possessionTeamId: receivingTeamId,
      driveNumber: state.driveNumber + 1,
      down: { down: 1, yardsToGo: 10, yardLine: 25, possessionTeamId: receivingTeamId },
      log,
    };
    return quarterEnded ? handleQuarterEnd(finalState) : finalState;
  }

  const gained = newYardLine - down.yardLine;
  const firstDownAchieved = gained >= down.yardsToGo;

  if (firstDownAchieved) {
    log.push(`Gain of ${gained}, first down.`);
    const finalState: GameState = {
      ...state,
      clock,
      lastPlay: play,
      down: { down: 1, yardsToGo: 10, yardLine: newYardLine, possessionTeamId: down.possessionTeamId },
      log,
    };
    return quarterEnded ? handleQuarterEnd(finalState) : finalState;
  }

  if (down.down === 4) {
    const newPossession = otherTeam(state, state.possessionTeamId);
    log.push(`Turnover on downs at the ${newYardLine}-yard line.`);
    const finalState: GameState = {
      ...state,
      clock,
      lastPlay: play,
      possessionTeamId: newPossession,
      driveNumber: state.driveNumber + 1,
      down: { down: 1, yardsToGo: 10, yardLine: 100 - newYardLine, possessionTeamId: newPossession },
      log,
    };
    return quarterEnded ? handleQuarterEnd(finalState) : finalState;
  }

  log.push(`Gain of ${gained}, ${down.down + 1} down and ${down.yardsToGo - gained}.`);
  const finalState: GameState = {
    ...state,
    clock,
    lastPlay: play,
    down: {
      down: (down.down + 1) as DownState["down"],
      yardsToGo: down.yardsToGo - gained,
      yardLine: newYardLine,
      possessionTeamId: down.possessionTeamId,
    },
    log,
  };
  return quarterEnded ? handleQuarterEnd(finalState) : finalState;
}

/**
 * advanceClock already rolled the clock into the next quarter (or held Q4 at 0).
 * This only needs to resolve the two special cases: Q4 ending in a tie starts
 * sudden-death OT, and Q4 (or OT) ending decisively ends the game.
 */
function handleQuarterEnd(state: GameState): GameState {
  const atQ4Zero = state.clock.quarter === 4 && state.clock.secondsRemaining <= 0;
  const atOTZero = state.clock.quarter === "OT" && state.clock.secondsRemaining <= 0;
  if (!atQ4Zero && !atOTZero) return state;
  if (state.homeScore === state.awayScore) {
    return { ...state, clock: { quarter: "OT", secondsRemaining: QUARTER_SECONDS } };
  }
  return { ...state, phase: "final" };
}

export function isGameOver(state: GameState): boolean {
  return state.phase === "final";
}

export function finalizeGame(state: GameState): GameState {
  return { ...state, phase: "final" };
}
