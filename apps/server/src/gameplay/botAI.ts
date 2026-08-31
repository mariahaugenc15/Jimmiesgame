import type { DefensivePlay, DownState, OffensivePlay } from "@lockedin/shared";

const OFFENSIVE_PLAYS: OffensivePlay[] = [
  "inside_run",
  "outside_run",
  "short_pass",
  "deep_pass",
  "play_action",
  "screen_pass",
];
const DEFENSIVE_PLAYS: DefensivePlay[] = ["run_stack", "man_coverage", "zone_coverage", "blitz", "prevent"];

function pick<T>(items: T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

/** Simple situational heuristic bot for offense: leans on down/distance rather than pure randomness. */
export function botChooseOffensivePlay(down: DownState, rand: () => number = Math.random): OffensivePlay {
  if (down.down >= 3 && down.yardsToGo >= 7) {
    return rand() < 0.7 ? "deep_pass" : "short_pass";
  }
  if (down.down === 3 && down.yardsToGo <= 3) {
    return rand() < 0.6 ? "inside_run" : "short_pass";
  }
  if (down.down === 1) {
    return pick(["inside_run", "outside_run", "short_pass", "play_action"], rand);
  }
  return pick(OFFENSIVE_PLAYS, rand);
}

/** Simple situational heuristic bot for defense: guards against likely offensive tendencies. */
export function botChooseDefensivePlay(down: DownState, rand: () => number = Math.random): DefensivePlay {
  if (down.down >= 3 && down.yardsToGo >= 7) {
    return rand() < 0.5 ? "zone_coverage" : "blitz";
  }
  if (down.down <= 2 && down.yardsToGo >= 8) {
    return rand() < 0.6 ? "run_stack" : "man_coverage";
  }
  return pick(DEFENSIVE_PLAYS, rand);
}
