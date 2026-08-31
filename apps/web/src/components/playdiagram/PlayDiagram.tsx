import { useId } from "react";
import type { OffensivePlay, PlayResult } from "@lockedin/shared";
import { DoodleFigure } from "./DoodleFigure";
import { depthFractionForYards, FIELD_H, FIELD_W, LOS_X, routePath } from "./routes";
import "./playdiagram.css";

interface OutcomeMeta {
  text: string;
  className: string;
  turnover?: boolean;
  celebrate?: boolean;
}

function outcomeMeta(result: PlayResult): OutcomeMeta {
  switch (result.type) {
    case "touchdown":
      return { text: "TOUCHDOWN!", className: "bg-primary-500/20 text-primary-300 border-primary-400/50", celebrate: true };
    case "gain":
      return { text: `+${result.yards} YDS`, className: "bg-primary-500/15 text-primary-300 border-primary-500/40" };
    case "incomplete":
      return { text: "INCOMPLETE", className: "bg-locked-500/15 text-locked-300 border-locked-500/40" };
    case "sack":
      return { text: `SACK ${result.yards}`, className: "bg-danger-500/15 text-danger-300 border-danger-500/40" };
    case "interception":
      return { text: "INTERCEPTED", className: "bg-danger-500/20 text-danger-300 border-danger-500/50", turnover: true };
    case "fumble":
      return { text: "FUMBLE", className: "bg-danger-500/20 text-danger-300 border-danger-500/50", turnover: true };
    case "turnover_on_downs":
      return { text: "TURNOVER ON DOWNS", className: "bg-locked-500/15 text-locked-300 border-locked-500/40" };
  }
}

const DEFENDER_SPOTS: [number, number][] = [
  [LOS_X + 30, 30],
  [LOS_X + 40, 60],
  [LOS_X + 55, 92],
  [LOS_X + 80, 45],
];

interface PlayDiagramProps {
  play: OffensivePlay;
  result: PlayResult;
}

/**
 * The coach's-whiteboard resolution for one play: a route line draws itself,
 * a doodle ball-carrier travels it, and an outcome badge lands at the end.
 * Built from the same small route/figure vocabulary regardless of play type
 * or outcome - see routes.ts and DoodleFigure.
 */
export function PlayDiagram({ play, result }: PlayDiagramProps) {
  const routeId = useId().replace(/:/g, "");
  const meta = outcomeMeta(result);
  const depth = depthFractionForYards(result.yards);
  const path = routePath(play, depth);

  return (
    <div className="overflow-hidden rounded-xl bg-pitch p-3">
      <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="w-full">
        {/* mini field: yard stripes + end zone, coach's-whiteboard green */}
        {Array.from({ length: 6 }, (_, i) => LOS_X - 20 + i * 44).map((x) => (
          <line key={x} x1={x} y1={8} x2={x} y2={FIELD_H - 8} stroke="#1f6b3f" strokeWidth={1} />
        ))}
        <rect x={FIELD_W - 22} y={0} width={22} height={FIELD_H} fill="#062b18" />
        <line x1={LOS_X} y1={4} x2={LOS_X} y2={FIELD_H - 4} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 2" />

        {/* defense: doodle X's scattered downfield, coach's-whiteboard convention */}
        {DEFENDER_SPOTS.map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <DoodleFigure variant="defense" size={4.5} />
          </g>
        ))}

        {/* the route itself, and the path the ball-carrier doodle animates along */}
        <path
          id={routeId}
          d={path}
          fill="none"
          stroke={meta.turnover ? "#F87171" : "#10D688"}
          strokeWidth={2.5}
          strokeLinecap="round"
          pathLength={1}
          className="play-diagram-route"
        />

        <g>
          <DoodleFigure variant="offense" size={6} />
          <animateMotion dur="0.7s" begin="0.05s" fill="freeze" rotate="auto">
            <mpath href={`#${routeId}`} />
          </animateMotion>
        </g>

        {meta.celebrate && (
          <circle cx={FIELD_W - 22} cy={FIELD_H / 2} r={9} fill="none" stroke="#10D688" strokeWidth={2} className="play-diagram-td-pulse" />
        )}
      </svg>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {play
            .split("_")
            .map((w) => w[0].toUpperCase() + w.slice(1))
            .join(" ")}
        </span>
        <span className={`play-diagram-badge rounded-md border px-2 py-1 text-[11px] font-bold tracking-wide ${meta.className}`}>
          {meta.text}
        </span>
      </div>
    </div>
  );
}
