import { describe, expect, it } from "vitest";
import type { WeeklyStatLine } from "@jimmiesgame/shared";
import { computeRatingFromStats, computeRatingsForWeek } from "./index.js";

function statLine(overrides: Partial<WeeklyStatLine>): WeeklyStatLine {
  return { playerId: "p1", season: 2025, week: 1, ...overrides };
}

describe("computeRatingFromStats", () => {
  it("clamps all attributes and overall within 40-99", () => {
    const positions = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
    for (const position of positions) {
      const rating = computeRatingFromStats(position, statLine({}));
      for (const key of ["speed", "power", "accuracy", "catching", "awareness", "stamina", "overall"] as const) {
        expect(rating[key]).toBeGreaterThanOrEqual(40);
        expect(rating[key]).toBeLessThanOrEqual(99);
      }
    }
  });

  it("gives a QB with a great game higher accuracy and awareness than a poor game", () => {
    const great = computeRatingFromStats(
      "QB",
      statLine({ passAttempts: 35, passCompletions: 28, passYards: 340, passTDs: 4, interceptions: 0 }),
    );
    const poor = computeRatingFromStats(
      "QB",
      statLine({ passAttempts: 35, passCompletions: 16, passYards: 180, passTDs: 0, interceptions: 3 }),
    );
    expect(great.accuracy).toBeGreaterThan(poor.accuracy);
    expect(great.awareness).toBeGreaterThan(poor.awareness);
    expect(great.overall).toBeGreaterThan(poor.overall);
  });

  it("rewards RB breakaway efficiency with higher speed", () => {
    const explosive = computeRatingFromStats(
      "RB",
      statLine({ rushAttempts: 15, rushYards: 140, rushTDs: 2, targets: 2, receptions: 1, receivingYards: 10 }),
    );
    const grinder = computeRatingFromStats(
      "RB",
      statLine({ rushAttempts: 20, rushYards: 55, rushTDs: 0, targets: 2, receptions: 1, receivingYards: 5 }),
    );
    expect(explosive.speed).toBeGreaterThan(grinder.speed);
  });

  it("rewards WR catch rate and yards with higher catching and speed", () => {
    const stud = computeRatingFromStats(
      "WR",
      statLine({ targets: 10, receptions: 9, receivingYards: 150, receivingTDs: 2 }),
    );
    const quiet = computeRatingFromStats(
      "WR",
      statLine({ targets: 6, receptions: 2, receivingYards: 20, receivingTDs: 0 }),
    );
    expect(stud.catching).toBeGreaterThan(quiet.catching);
    expect(stud.overall).toBeGreaterThan(quiet.overall);
  });

  it("gives a kicker higher accuracy on a perfect night", () => {
    const perfect = computeRatingFromStats(
      "K",
      statLine({ fieldGoalsAttempted: 3, fieldGoalsMade: 3, longestFieldGoal: 52, extraPointsMade: 3 }),
    );
    const shaky = computeRatingFromStats(
      "K",
      statLine({ fieldGoalsAttempted: 3, fieldGoalsMade: 1, longestFieldGoal: 40, extraPointsMade: 2 }),
    );
    expect(perfect.accuracy).toBeGreaterThan(shaky.accuracy);
  });

  it("rewards DEF takeaways and sacks with higher power and awareness", () => {
    const dominant = computeRatingFromStats(
      "DEF",
      statLine({ tackles: 50, sacks: 5, interceptionsForced: 2, fumbleRecoveries: 1, pointsAllowed: 10 }),
    );
    const passive = computeRatingFromStats(
      "DEF",
      statLine({ tackles: 30, sacks: 0, interceptionsForced: 0, fumbleRecoveries: 0, pointsAllowed: 28 }),
    );
    expect(dominant.power).toBeGreaterThan(passive.power);
    expect(dominant.awareness).toBeGreaterThan(passive.awareness);
  });

  it("is deterministic for identical inputs", () => {
    const a = computeRatingFromStats("WR", statLine({ targets: 8, receptions: 6, receivingYards: 90 }));
    const b = computeRatingFromStats("WR", statLine({ targets: 8, receptions: 6, receivingYards: 90 }));
    expect(a).toEqual(b);
  });
});

describe("computeRatingsForWeek", () => {
  it("skips players with no stats and computes the rest", () => {
    const players = [
      { id: "p1", position: "QB" as const },
      { id: "p2", position: "RB" as const },
    ];
    const statsByPlayerId = new Map([["p1", statLine({ playerId: "p1", passAttempts: 30, passCompletions: 20 })]]);
    const ratings = computeRatingsForWeek(players, statsByPlayerId);
    expect(ratings).toHaveLength(1);
    expect(ratings[0].playerId).toBe("p1");
  });
});
