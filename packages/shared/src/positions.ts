export type Position = "QB" | "RB" | "WR" | "TE" | "DEF" | "K";

export type RosterSlotType = "QB" | "RB" | "WR" | "TE" | "FLEX" | "DEF" | "K" | "BENCH";

/** Standard single-QB roster: 9 starters + 6 bench, snake draft over 15 rounds. */
export const ROSTER_RULES: { slot: RosterSlotType; count: number; eligible: Position[] }[] = [
  { slot: "QB", count: 1, eligible: ["QB"] },
  { slot: "RB", count: 2, eligible: ["RB"] },
  { slot: "WR", count: 2, eligible: ["WR"] },
  { slot: "TE", count: 1, eligible: ["TE"] },
  { slot: "FLEX", count: 1, eligible: ["RB", "WR", "TE"] },
  { slot: "DEF", count: 1, eligible: ["DEF"] },
  { slot: "K", count: 1, eligible: ["K"] },
  { slot: "BENCH", count: 6, eligible: ["QB", "RB", "WR", "TE", "DEF", "K"] },
];

export const STARTER_SLOT_COUNT = ROSTER_RULES.filter((r) => r.slot !== "BENCH").reduce(
  (sum, r) => sum + r.count,
  0,
);

export const TOTAL_ROSTER_SIZE = ROSTER_RULES.reduce((sum, r) => sum + r.count, 0);

export const DRAFT_ROUNDS = TOTAL_ROSTER_SIZE;
