import { routePath } from "./routes";
import "./playdiagram.css";

const DEMO_ROUTES: { play: Parameters<typeof routePath>[0]; depth: number; y: number }[] = [
  { play: "deep_pass", depth: 0.95, y: 20 },
  { play: "outside_run", depth: 0.6, y: 60 },
  { play: "short_pass", depth: 0.45, y: 100 },
  { play: "inside_run", depth: 0.5, y: 140 },
];

/**
 * Ambient reuse of the same route-line vocabulary as the live match
 * diagram - ownerless X's and O's on a whiteboard, faded behind the login
 * form. Not another animation system: same routes.ts, same doodle style.
 */
export function RouteBackdrop() {
  return (
    <svg
      viewBox="0 0 300 160"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
      aria-hidden="true"
    >
      {DEMO_ROUTES.map(({ play, depth, y }, i) => (
        <g key={i} transform={`translate(0, ${y - 70})`}>
          <path
            d={routePath(play, depth)}
            fill="none"
            stroke="#10D688"
            strokeWidth={1.6}
            strokeLinecap="round"
            pathLength={1}
            className="play-diagram-route"
            style={{ animationDelay: `${i * 220}ms`, animationDuration: "2200ms" }}
          />
          <circle cx={44} cy={70} r={3} fill="#10D688" />
        </g>
      ))}
    </svg>
  );
}
