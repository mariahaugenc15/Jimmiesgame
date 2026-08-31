interface DoodleFigureProps {
  /** "O" for offense (filled dot), "X" for defense - coach's-whiteboard convention, not a rendered player likeness. */
  variant?: "offense" | "defense" | "ball";
  size?: number;
}

/** The one doodle-figure shape every play diagram reuses, instead of bespoke art per play. */
export function DoodleFigure({ variant = "offense", size = 6 }: DoodleFigureProps) {
  if (variant === "defense") {
    return (
      <g stroke="#F87171" strokeWidth={1.6} strokeLinecap="round">
        <line x1={-size} y1={-size} x2={size} y2={size} />
        <line x1={-size} y1={size} x2={size} y2={-size} />
      </g>
    );
  }
  if (variant === "ball") {
    return <ellipse rx={size * 0.6} ry={size * 0.4} fill="#D4A056" stroke="#3f2a0f" strokeWidth={0.8} />;
  }
  return (
    <g>
      <circle r={size} fill="#10D688" stroke="#054A2E" strokeWidth={1.2} />
      {/* small facing/direction tick, coach's-whiteboard style */}
      <line x1={0} y1={0} x2={size + 4} y2={0} stroke="#054A2E" strokeWidth={1.4} />
    </g>
  );
}
