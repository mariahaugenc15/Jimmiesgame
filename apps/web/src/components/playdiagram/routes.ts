import type { OffensivePlay } from "@lockedin/shared";

export const FIELD_W = 300;
export const FIELD_H = 140;
export const LOS_X = 44;
const MID_Y = 70;

/**
 * A small, reusable set of route-line shapes (one per offensive play call),
 * generated as a function of how far downfield the play actually went -
 * not a separate bespoke animation per play type/outcome. Every play type
 * reuses the same doodle-figure + outcome-badge system around it.
 */
export function routePath(play: OffensivePlay, depthFraction: number): string {
  const reach = Math.max(0.06, Math.min(1, depthFraction));
  const endX = LOS_X + reach * (FIELD_W - LOS_X - 24);

  switch (play) {
    case "inside_run":
      return `M${LOS_X},${MID_Y} L${endX},${MID_Y}`;
    case "outside_run":
      return `M${LOS_X},${MID_Y} C${LOS_X + 30},${MID_Y} ${LOS_X + 46},${MID_Y - 40} ${LOS_X + 70},${MID_Y - 44} L${endX},${MID_Y - 44}`;
    case "short_pass":
      return `M${LOS_X},${MID_Y} C${LOS_X + 18},${MID_Y - 22} ${LOS_X + 36},${MID_Y - 38} ${LOS_X + 50},${MID_Y - 40} L${endX},${MID_Y - 40}`;
    case "deep_pass":
      return `M${LOS_X},${MID_Y} C${LOS_X + 40},${MID_Y - 18} ${LOS_X + 80},${MID_Y - 48} ${endX},${MID_Y - 52}`;
    case "play_action":
      return `M${LOS_X},${MID_Y} q9,12 0,20 C${LOS_X + 28},${MID_Y + 8} ${LOS_X + 55},${MID_Y - 30} ${endX},${MID_Y - 34}`;
    case "screen_pass":
      return `M${LOS_X},${MID_Y} C${LOS_X - 16},${MID_Y + 14} ${LOS_X - 16},${MID_Y + 30} ${LOS_X},${MID_Y + 32} L${endX},${MID_Y + 32}`;
    default:
      return `M${LOS_X},${MID_Y} L${endX},${MID_Y}`;
  }
}

/** Roughly maps real yards gained onto a 0..1 fraction of the diagram's width, for visual pacing only. */
export function depthFractionForYards(yards: number): number {
  return Math.max(0.08, Math.min(1, yards / 35));
}

/** Where routePath's line actually ends, for placing a name label at the doodle figure's resting spot. */
export function routeEndPoint(play: OffensivePlay, depthFraction: number): { x: number; y: number } {
  const reach = Math.max(0.06, Math.min(1, depthFraction));
  const endX = LOS_X + reach * (FIELD_W - LOS_X - 24);
  switch (play) {
    case "outside_run":
      return { x: endX, y: MID_Y - 44 };
    case "short_pass":
      return { x: endX, y: MID_Y - 40 };
    case "deep_pass":
      return { x: endX, y: MID_Y - 52 };
    case "play_action":
      return { x: endX, y: MID_Y - 34 };
    case "screen_pass":
      return { x: endX, y: MID_Y + 32 };
    default:
      return { x: endX, y: MID_Y };
  }
}
