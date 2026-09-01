import { FIELD_H, FIELD_W, LOS_X } from "./routes";

/** The shared field look (yard stripes, end zone, line of scrimmage) - reused by both the pre-snap and resolved states of PlayTheater so they read as one continuous field, not two different diagrams. */
export function FieldBackground() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => LOS_X - 20 + i * 44).map((x) => (
        <line key={x} x1={x} y1={8} x2={x} y2={FIELD_H - 8} stroke="#1f6b3f" strokeWidth={1} />
      ))}
      <rect x={FIELD_W - 22} y={0} width={22} height={FIELD_H} fill="#062b18" />
      <line x1={LOS_X} y1={4} x2={LOS_X} y2={FIELD_H - 4} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 2" />
    </>
  );
}
