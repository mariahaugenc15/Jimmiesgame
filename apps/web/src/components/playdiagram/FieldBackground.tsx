import { FIELD_H, FIELD_W, LOS_X, MAX_PLAY_YARDS, yardsToX } from "./routes";

/** How far downfield each labeled gridline sits, in yards past the line of scrimmage - this diagram zooms in on one play's development, not the whole 100-yard field (see FieldPositionTracker for that), so gridlines are relative to the snap, not the goal line. */
const GRIDLINE_YARDS = [10, 20, 30];

/** The shared field look (yard stripes, end zone, line of scrimmage) - reused by both the pre-snap and resolved states of PlayTheater so they read as one continuous field, not two different diagrams. Gridlines are labeled in yards past the snap so a play's gain reads visually, not just from the "+N YDS" badge. */
export function FieldBackground() {
  return (
    <>
      {GRIDLINE_YARDS.map((yards) => {
        const x = yardsToX(yards);
        return (
          <g key={yards}>
            <line x1={x} y1={8} x2={x} y2={FIELD_H - 8} stroke="#1f6b3f" strokeWidth={1} />
            <text x={x} y={FIELD_H - 3} textAnchor="middle" fontSize={6} fill="#3f8f63">
              +{yards}
            </text>
          </g>
        );
      })}
      <rect x={yardsToX(MAX_PLAY_YARDS)} y={0} width={FIELD_W - yardsToX(MAX_PLAY_YARDS)} height={FIELD_H} fill="#062b18" />
      <line x1={LOS_X} y1={4} x2={LOS_X} y2={FIELD_H - 4} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 2" />
      <text x={LOS_X} y={FIELD_H - 3} textAnchor="middle" fontSize={6} fill="#7dd3fc">
        snap
      </text>
    </>
  );
}
