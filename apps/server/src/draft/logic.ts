import { DRAFT_ROUNDS, ROSTER_RULES, type Position, type RosterSlotType } from "@lockedin/shared";

export interface DraftPickSlot {
  round: number;
  pickInRound: number;
  overallPick: number;
  teamId: string;
}

/** Generates a full snake draft order: round 1 forward, round 2 reversed, etc. */
export function generateSnakeOrder(teamIds: string[], rounds: number = DRAFT_ROUNDS): DraftPickSlot[] {
  const picks: DraftPickSlot[] = [];
  let overallPick = 1;
  for (let round = 1; round <= rounds; round++) {
    const order = round % 2 === 1 ? teamIds : [...teamIds].reverse();
    order.forEach((teamId, index) => {
      picks.push({ round, pickInRound: index + 1, overallPick, teamId });
      overallPick += 1;
    });
  }
  return picks;
}

export interface DraftablePlayer {
  id: string;
  position: Position;
  overall: number;
}

export interface AssignedSlot {
  nflPlayerId: string;
  rosterPosition: RosterSlotType;
  draftRound: number;
}

/**
 * Greedy best-player-available roster fill for solo mode: fills required
 * starting slots (highest overall first for each slot's eligible positions),
 * then FLEX, then bench with whatever remains. Used to instantly build a
 * full roster for the user (and every bot) which can then be edited by hand
 * before the season locks.
 */
export function autoFillRoster(availablePlayers: DraftablePlayer[]): {
  assigned: AssignedSlot[];
  remaining: DraftablePlayer[];
} {
  const pool = [...availablePlayers].sort((a, b) => b.overall - a.overall);
  const assigned: AssignedSlot[] = [];
  let round = 1;

  for (const rule of ROSTER_RULES) {
    for (let i = 0; i < rule.count; i++) {
      const index = pool.findIndex((p) => rule.eligible.includes(p.position));
      if (index === -1) continue;
      const [player] = pool.splice(index, 1);
      assigned.push({ nflPlayerId: player.id, rosterPosition: rule.slot, draftRound: round });
      round += 1;
    }
  }

  return { assigned, remaining: pool };
}

export function isValidPickForSlot(position: Position, slot: RosterSlotType): boolean {
  const rule = ROSTER_RULES.find((r) => r.slot === slot);
  return rule ? rule.eligible.includes(position) : false;
}

/** Finds the best-fit open roster slot for a newly picked player (required slot first, then FLEX, then bench). */
/**
 * Runs a full best-player-available snake draft across all participants
 * (the user's team plus bot teams) against a shared player pool, so solo
 * mode produces a fair, immediately-playable roster for every team. The
 * user can then hand-edit their own team's assignments before lock.
 */
export function runSoloDraft(
  teamIds: string[],
  availablePlayers: DraftablePlayer[],
): { picksByTeam: Map<string, AssignedSlot[]>; order: DraftPickSlot[] } {
  const pool = [...availablePlayers].sort((a, b) => b.overall - a.overall);
  const order = generateSnakeOrder(teamIds);
  const picksByTeam = new Map<string, AssignedSlot[]>(teamIds.map((id) => [id, []]));

  for (const pick of order) {
    const filledSlots = picksByTeam.get(pick.teamId)!.map((a) => a.rosterPosition);
    const candidateIndex = pool.findIndex((p) => findOpenSlotForPlayer(p.position, filledSlots) !== null);
    if (candidateIndex === -1) continue;
    const [player] = pool.splice(candidateIndex, 1);
    const slot = findOpenSlotForPlayer(player.position, filledSlots)!;
    picksByTeam.get(pick.teamId)!.push({ nflPlayerId: player.id, rosterPosition: slot, draftRound: pick.round });
  }

  return { picksByTeam, order };
}

export function findOpenSlotForPlayer(
  position: Position,
  filledSlots: RosterSlotType[],
): RosterSlotType | null {
  for (const rule of ROSTER_RULES) {
    if (rule.slot === "BENCH") continue;
    if (!rule.eligible.includes(position)) continue;
    const filledCount = filledSlots.filter((s) => s === rule.slot).length;
    if (filledCount < rule.count) return rule.slot;
  }
  const benchRule = ROSTER_RULES.find((r) => r.slot === "BENCH")!;
  const benchFilled = filledSlots.filter((s) => s === "BENCH").length;
  if (benchFilled < benchRule.count) return "BENCH";
  return null;
}
