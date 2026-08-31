import { describe, expect, it } from "vitest";
import { TOTAL_ROSTER_SIZE } from "@lockedin/shared";
import {
  autoFillRoster,
  findOpenSlotForPlayer,
  generateSnakeOrder,
  isValidPickForSlot,
  runSoloDraft,
} from "./logic.js";

describe("generateSnakeOrder", () => {
  it("reverses order on even rounds", () => {
    const picks = generateSnakeOrder(["a", "b", "c"], 2);
    expect(picks.slice(0, 3).map((p) => p.teamId)).toEqual(["a", "b", "c"]);
    expect(picks.slice(3, 6).map((p) => p.teamId)).toEqual(["c", "b", "a"]);
  });

  it("assigns sequential overall pick numbers", () => {
    const picks = generateSnakeOrder(["a", "b"], 3);
    expect(picks.map((p) => p.overallPick)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("autoFillRoster", () => {
  it("fills every required slot before touching the bench", () => {
    const players = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      position: (["QB", "RB", "WR", "TE", "DEF", "K"] as const)[i % 6],
      overall: 99 - i,
    }));
    const { assigned } = autoFillRoster(players);
    expect(assigned).toHaveLength(TOTAL_ROSTER_SIZE);
    const qbCount = assigned.filter((a) => a.rosterPosition === "QB").length;
    expect(qbCount).toBe(1);
  });

  it("prefers higher overall players, benching the rest at the position", () => {
    const players = [
      { id: "star", position: "QB" as const, overall: 95 },
      { id: "backup", position: "QB" as const, overall: 60 },
    ];
    const { assigned, remaining } = autoFillRoster(players);
    const qbPick = assigned.find((a) => a.rosterPosition === "QB");
    expect(qbPick?.nflPlayerId).toBe("star");
    // Only one starting QB slot exists; the backup lands on the bench (any position is bench-eligible).
    const benchPick = assigned.find((a) => a.nflPlayerId === "backup");
    expect(benchPick?.rosterPosition).toBe("BENCH");
    expect(remaining).toHaveLength(0);
  });
});

describe("runSoloDraft", () => {
  it("gives every team a full, non-overlapping roster from a shared pool", () => {
    const positions: readonly ("QB" | "RB" | "WR" | "TE" | "DEF" | "K")[] = ["QB", "RB", "WR", "TE", "DEF", "K"];
    const players = Array.from({ length: 90 }, (_, i) => ({
      id: `p${i}`,
      position: positions[i % positions.length],
      overall: 99 - (i % 60),
    }));
    const { picksByTeam } = runSoloDraft(["user", "bot1", "bot2"], players);
    expect(picksByTeam.get("user")).toHaveLength(TOTAL_ROSTER_SIZE);
    expect(picksByTeam.get("bot1")).toHaveLength(TOTAL_ROSTER_SIZE);
    const allPlayerIds = [...picksByTeam.values()].flat().map((a) => a.nflPlayerId);
    expect(new Set(allPlayerIds).size).toBe(allPlayerIds.length);
  });
});

describe("slot rules", () => {
  it("allows RB/WR/TE into FLEX but not QB", () => {
    expect(isValidPickForSlot("RB", "FLEX")).toBe(true);
    expect(isValidPickForSlot("QB", "FLEX")).toBe(false);
  });

  it("routes a third RB into FLEX once both RB slots are filled", () => {
    const slot = findOpenSlotForPlayer("RB", ["RB", "RB"]);
    expect(slot).toBe("FLEX");
  });

  it("routes overflow into bench once starting slots are full", () => {
    const slot = findOpenSlotForPlayer("RB", ["RB", "RB", "FLEX"]);
    expect(slot).toBe("BENCH");
  });
});
