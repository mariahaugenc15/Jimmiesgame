import { useId } from "react";
import type { OffensivePlay, PlayResult } from "@lockedin/shared";
import { DoodleFigure } from "./DoodleFigure";
import { FieldBackground } from "./FieldBackground";
import { DEFENDER_SPOTS, defenderPursuitPath, depthFractionForYards, FIELD_H, FIELD_W, routeEndPoint, routePath } from "./routes";
import { explainOutcome, shortenName, type InsightPlayer } from "../../lib/playInsights";
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
      return {
        text: `${result.yards >= 0 ? "+" : ""}${result.yards} YDS`,
        className: "bg-primary-500/15 text-primary-300 border-primary-500/40",
      };
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

interface PlayDiagramProps {
  play: OffensivePlay;
  result: PlayResult;
  /** The real player the engine attributed this play to (ballCarrierId/targetId resolved via roster lookup) - names the doodle instead of leaving it anonymous. */
  player?: InsightPlayer | null;
  /** The offense's chosen team icon (a TeamIconShape keyword) - replaces the default circle ball-carrier. */
  icon?: string | null;
}

/**
 * The coach's-whiteboard resolution for one play: a route line draws itself,
 * a doodle ball-carrier travels it, and an outcome badge lands at the end.
 * Built from the same small route/figure vocabulary regardless of play type
 * or outcome - see routes.ts and DoodleFigure. When a player is supplied,
 * their name labels the doodle and the caption explains the outcome in
 * terms of their actual rating, not a generic line.
 */
export function PlayDiagram({ play, result, player, icon }: PlayDiagramProps) {
  const routeId = useId().replace(/:/g, "");
  const meta = outcomeMeta(result);
  const depth = depthFractionForYards(result.yards);
  const path = routePath(play, depth);
  const end = routeEndPoint(play, depth);

  return (
    <div className="overflow-hidden rounded-xl bg-pitch p-3">
      <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="w-full">
        <FieldBackground />

        {/* defense: doodle X's scattered downfield, coach's-whiteboard convention -
            each closes in on the play along its own short pursuit path so the
            field reads as both sides reacting, not offense-only motion. */}
        {DEFENDER_SPOTS.map((spot, i) => {
          const [x, y] = spot;
          const defPathId = `${routeId}-def-${i}`;
          return (
            <g key={i}>
              <path id={defPathId} d={defenderPursuitPath(spot, end)} fill="none" stroke="none" />
              <g transform={`translate(${x},${y})`}>
                <DoodleFigure variant="defense" size={4.5} />
                <animateMotion
                  dur="1.6s"
                  begin={`${0.15 + i * 0.1}s`}
                  fill="freeze"
                  calcMode="spline"
                  keyTimes="0;1"
                  keySplines="0.33 0 0.15 1"
                >
                  <mpath href={`#${defPathId}`} />
                </animateMotion>
              </g>
            </g>
          );
        })}

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
          <DoodleFigure variant="offense" size={6} icon={icon} />
          <animateMotion
            dur="1.9s"
            begin="0.05s"
            fill="freeze"
            rotate="auto"
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.3 0 0.2 1"
          >
            <mpath href={`#${routeId}`} />
          </animateMotion>
        </g>

        {player && (
          <text
            x={end.x}
            y={end.y - 12}
            textAnchor="middle"
            className="play-diagram-badge"
            fill="#E2E8F0"
            fontSize={9}
            fontWeight={700}
          >
            {shortenName(player.name)}
          </text>
        )}

        {meta.celebrate && (
          <circle cx={FIELD_W - 22} cy={FIELD_H / 2} r={9} fill="none" stroke="#10D688" strokeWidth={2} className="play-diagram-td-pulse" />
        )}
      </svg>

      <div className="mt-2 flex items-center justify-between gap-2">
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

      <p className="play-diagram-badge mt-1.5 text-xs text-slate-400">{explainOutcome(result, player ?? null)}</p>
    </div>
  );
}
