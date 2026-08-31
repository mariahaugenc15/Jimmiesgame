import type { Position, RosterSlotType } from "./positions.js";

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface Season {
  id: string;
  year: number;
  startDate: string;
  draftLockDate: string;
  currentWeek: number;
}

export interface Team {
  id: string;
  ownerId: string;
  name: string;
  seasonId: string;
  lockedAt: string | null;
  createdAt: string;
}

export interface NFLPlayer {
  id: string;
  name: string;
  realNflTeam: string;
  position: Position;
  externalId: string;
  jerseyNumber?: number;
}

/** Raw box-score stats for one player in one week, shape varies by position (unused fields omitted). */
export interface WeeklyStatLine {
  playerId: string;
  season: number;
  week: number;
  passAttempts?: number;
  passCompletions?: number;
  passYards?: number;
  passTDs?: number;
  interceptions?: number;
  rushAttempts?: number;
  rushYards?: number;
  rushTDs?: number;
  targets?: number;
  receptions?: number;
  receivingYards?: number;
  receivingTDs?: number;
  fumblesLost?: number;
  sacksAllowed?: number;
  tackles?: number;
  sacks?: number;
  interceptionsForced?: number;
  fumbleRecoveries?: number;
  defensiveTDs?: number;
  pointsAllowed?: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  longestFieldGoal?: number;
  extraPointsMade?: number;
  snapShare?: number;
}

/** Normalized 0-99 in-game attributes, derived weekly from real stats. */
export interface PlayerRating {
  playerId: string;
  season: number;
  week: number;
  speed: number;
  power: number;
  accuracy: number;
  catching: number;
  awareness: number;
  stamina: number;
  overall: number;
}

export interface RosterSlot {
  teamId: string;
  nflPlayerId: string;
  rosterPosition: RosterSlotType;
  draftRound: number;
}

export type DraftType = "snake" | "auction";

export interface DraftPick {
  round: number;
  pickInRound: number;
  overallPick: number;
  teamId: string;
  nflPlayerId: string | null;
  pickedAt: string | null;
}

export interface Draft {
  id: string;
  seasonId: string;
  type: DraftType;
  participantTeamIds: string[];
  picks: DraftPick[];
  isSolo: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export type MatchStatus = "scheduled" | "in_progress" | "completed" | "abandoned";

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  week: number;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  completedAt: string | null;
}

export interface League {
  id: string;
  name: string;
  ownerId: string;
  memberTeamIds: string[];
  isPrivate: boolean;
  createdAt: string;
}

export interface MatchmakingEntry {
  userId: string;
  teamId: string;
  skillRating: number;
  queuedAt: string;
}
