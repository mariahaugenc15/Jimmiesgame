import { describe, expect, it } from "vitest";
import {
  applyPlayToGame,
  createInitialGameState,
  isGameOver,
  resolvePlay,
  startFirstDrive,
  type DefenseProfile,
  type OffenseProfile,
} from "./engine.js";

const AVERAGE_OFFENSE: OffenseProfile = {
  qbAccuracy: 70,
  qbAwareness: 70,
  rbSpeed: 70,
  rbPower: 70,
  wrCatching: 70,
  wrSpeed: 70,
  olPower: 70,
};

const AVERAGE_DEFENSE: DefenseProfile = {
  passRush: 70,
  coverage: 70,
  runStop: 70,
  takeawayAwareness: 70,
};

function sequenceRand(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe("resolvePlay", () => {
  it("produces a positive gain on a successful run against average defense", () => {
    const result = resolvePlay({
      offensivePlay: "inside_run",
      defensivePlay: "zone_coverage",
      offense: AVERAGE_OFFENSE,
      defense: AVERAGE_DEFENSE,
      rand: sequenceRand([0.1, 0.99, 0.99, 0.5]),
    });
    expect(result.type).toBe("gain");
    expect(result.yards).toBeGreaterThan(0);
  });

  it("gives a much faster RB a higher breakaway chance than a slow one", () => {
    const fast = resolvePlay({
      offensivePlay: "outside_run",
      defensivePlay: "man_coverage",
      offense: { ...AVERAGE_OFFENSE, rbSpeed: 99 },
      defense: AVERAGE_DEFENSE,
      rand: () => 0.9,
    });
    const slow = resolvePlay({
      offensivePlay: "outside_run",
      defensivePlay: "man_coverage",
      offense: { ...AVERAGE_OFFENSE, rbSpeed: 40 },
      defense: AVERAGE_DEFENSE,
      rand: () => 0.9,
    });
    expect(fast.breakawayChance).toBeGreaterThan(slow.breakawayChance);
  });

  it("returns a sack when the pass-rush roll beats protection", () => {
    const result = resolvePlay({
      offensivePlay: "deep_pass",
      defensivePlay: "blitz",
      offense: { ...AVERAGE_OFFENSE, olPower: 40 },
      defense: { ...AVERAGE_DEFENSE, passRush: 99 },
      rand: sequenceRand([0.01]),
    });
    expect(result.type).toBe("sack");
    expect(result.yards).toBeLessThan(0);
  });

  it("keeps success probability within a sane 0.05-0.95 band regardless of rating blowouts", () => {
    const result = resolvePlay({
      offensivePlay: "short_pass",
      defensivePlay: "prevent",
      offense: { ...AVERAGE_OFFENSE, qbAccuracy: 99 },
      defense: { ...AVERAGE_DEFENSE, coverage: 40 },
      rand: () => 0.5,
    });
    expect(result.successProbability).toBeGreaterThanOrEqual(0.05);
    expect(result.successProbability).toBeLessThanOrEqual(0.95);
  });
});

describe("game loop", () => {
  it("runs a coin toss into a first drive at the 25", () => {
    let state = createInitialGameState("m1", "home", "away");
    state = startFirstDrive(state, "away");
    expect(state.phase).toBe("in_progress");
    expect(state.down).toEqual({ down: 1, yardsToGo: 10, yardLine: 25, possessionTeamId: "away" });
  });

  it("awards a touchdown and flips possession when a play crosses the goal line", () => {
    let state = createInitialGameState("m1", "home", "away");
    state = startFirstDrive(state, "away");
    state = {
      ...state,
      down: { down: 1, yardsToGo: 10, yardLine: 95, possessionTeamId: "away" },
    };
    const play = resolvePlay({
      offensivePlay: "inside_run",
      defensivePlay: "prevent",
      offense: { ...AVERAGE_OFFENSE, rbPower: 99, rbSpeed: 99 },
      defense: { ...AVERAGE_DEFENSE, runStop: 20 },
      rand: sequenceRand([0.05, 0.99, 0.99, 0.01]),
    });
    const next = applyPlayToGame(state, { ...play, yards: 10 });
    expect(next.awayScore).toBe(7);
    expect(next.possessionTeamId).toBe("home");
    expect(next.down?.yardLine).toBe(25);
  });

  it("turns the ball over on downs after a stopped 4th down", () => {
    let state = createInitialGameState("m1", "home", "away");
    state = startFirstDrive(state, "away");
    state = {
      ...state,
      down: { down: 4, yardsToGo: 10, yardLine: 50, possessionTeamId: "away" },
    };
    const next = applyPlayToGame(state, {
      type: "gain",
      yards: 2,
      offensivePlay: "inside_run",
      defensivePlay: "run_stack",
      breakawayChance: 0,
      successProbability: 0.5,
    });
    expect(next.possessionTeamId).toBe("home");
    expect(next.down?.down).toBe(1);
    expect(next.down?.yardLine).toBe(48);
  });

  it("ends the game after the 4th quarter when the score is not tied", () => {
    let state = createInitialGameState("m1", "home", "away");
    state = startFirstDrive(state, "away");
    state = {
      ...state,
      homeScore: 21,
      awayScore: 14,
      clock: { quarter: 4, secondsRemaining: 5 },
    };
    const next = applyPlayToGame(state, {
      type: "gain",
      yards: 2,
      offensivePlay: "inside_run",
      defensivePlay: "run_stack",
      breakawayChance: 0,
      successProbability: 0.5,
    });
    expect(isGameOver(next)).toBe(true);
    expect(next.phase).toBe("final");
  });

  it("sends a tied game to overtime instead of ending it", () => {
    let state = createInitialGameState("m1", "home", "away");
    state = startFirstDrive(state, "away");
    state = {
      ...state,
      homeScore: 14,
      awayScore: 14,
      clock: { quarter: 4, secondsRemaining: 5 },
    };
    const next = applyPlayToGame(state, {
      type: "gain",
      yards: 2,
      offensivePlay: "inside_run",
      defensivePlay: "run_stack",
      breakawayChance: 0,
      successProbability: 0.5,
    });
    expect(isGameOver(next)).toBe(false);
    expect(next.clock.quarter).toBe("OT");
  });
});
