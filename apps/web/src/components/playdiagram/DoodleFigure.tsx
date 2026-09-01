import { isTeamIconShape, type TeamIconShape } from "@lockedin/shared";

interface DoodleFigureProps {
  /** "O" for offense (filled dot), "X" for defense - coach's-whiteboard convention, not a rendered player likeness. */
  variant?: "offense" | "defense" | "ball";
  size?: number;
  /** Offense only: the team's chosen icon (a TeamIconShape keyword, or null/unset for the default circle). */
  icon?: string | null;
  /** The small facing/direction tick makes sense on the field (which way the play is headed) but reads as a stray flag off it - default on, turn off for icon pickers/badges. */
  tick?: boolean;
}

/** The doodle-shape outline for a chosen team icon, filled/stroked to match the default offense circle. */
function ShapeGlyph({ shape, size }: { shape: TeamIconShape; size: number }) {
  const fill = "#10D688";
  const stroke = "#054A2E";
  const strokeWidth = 1.2;
  switch (shape) {
    case "triangle": {
      const h = size * 1.15;
      return <polygon points={`0,${-h} ${h * 0.95},${h * 0.7} ${-h * 0.95},${h * 0.7}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    }
    case "square": {
      const s = size * 0.9;
      return <rect x={-s} y={-s} width={s * 2} height={s * 2} rx={2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    }
    case "diamond": {
      const s = size * 1.05;
      return <polygon points={`0,${-s} ${s},0 0,${s} ${-s},0`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    }
    case "hexagon": {
      const s = size;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return `${(s * Math.cos(a)).toFixed(2)},${(s * Math.sin(a)).toFixed(2)}`;
      }).join(" ");
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    }
    case "star": {
      const outer = size * 1.15;
      const inner = size * 0.5;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
      }).join(" ");
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
    }
    case "circle":
    default:
      return <circle r={size} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
}

/** The one doodle-figure shape every play diagram reuses, instead of bespoke art per play. */
export function DoodleFigure({ variant = "offense", size = 6, icon, tick = true }: DoodleFigureProps) {
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
      <ShapeGlyph shape={icon && isTeamIconShape(icon) ? icon : "circle"} size={size} />
      {/* small facing/direction tick, coach's-whiteboard style */}
      {tick && <line x1={0} y1={0} x2={size + 4} y2={0} stroke="#054A2E" strokeWidth={1.4} />}
    </g>
  );
}
