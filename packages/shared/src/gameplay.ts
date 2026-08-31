export type OffensivePlay =
  | "inside_run"
  | "outside_run"
  | "short_pass"
  | "deep_pass"
  | "play_action"
  | "screen_pass";

export type DefensivePlay = "run_stack" | "man_coverage" | "zone_coverage" | "blitz" | "prevent";

export type PlayOutcomeType =
  | "gain"
  | "incomplete"
  | "sack"
  | "interception"
  | "fumble"
  | "touchdown"
  | "turnover_on_downs";

export interface PlayResult {
  type: PlayOutcomeType;
  yards: number;
  offensivePlay: OffensivePlay;
  defensivePlay: DefensivePlay;
  ballCarrierId?: string;
  targetId?: string;
  breakawayChance: number;
  successProbability: number;
}

export interface DownState {
  down: 1 | 2 | 3 | 4;
  yardsToGo: number;
  yardLine: number; // 0-100, own goal line to opponent goal line, offense-relative
  possessionTeamId: string;
}

export type GamePhase =
  | "pregame"
  | "coin_toss"
  | "in_progress"
  | "halftime"
  | "final";

export interface ClockState {
  quarter: 1 | 2 | 3 | 4 | "OT";
  secondsRemaining: number;
}

export interface GameState {
  matchId: string;
  phase: GamePhase;
  clock: ClockState;
  down: DownState | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  possessionTeamId: string | null;
  lastPlay: PlayResult | null;
  driveNumber: number;
  log: string[];
}

export interface PlayCallInput {
  matchId: string;
  teamId: string;
  offensivePlay?: OffensivePlay;
  defensivePlay?: DefensivePlay;
}
