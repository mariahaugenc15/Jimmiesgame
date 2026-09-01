import { routePath } from "./routes";
import "./playdiagram.css";

const AMBIENT_ROUTES: { play: Parameters<typeof routePath>[0]; depth: number; x: number; y: number; delay: number }[] = [
  { play: "deep_pass", depth: 0.95, x: 0, y: 30, delay: 0 },
  { play: "outside_run", depth: 0.6, x: 40, y: 90, delay: 1200 },
  { play: "short_pass", depth: 0.45, x: -20, y: 150, delay: 2600 },
  { play: "inside_run", depth: 0.5, x: 90, y: 210, delay: 400 },
  { play: "screen_pass", depth: 0.55, x: 150, y: 60, delay: 3400 },
  { play: "play_action", depth: 0.7, x: 190, y: 170, delay: 1900 },
];

/**
 * Persistent, app-wide ambient reuse of the same route-line vocabulary as
 * the live match diagram - a coach's whiteboard quietly cycling behind
 * every page, instead of a flat black void. Mounted once at the app root
 * (see App.tsx) so it doesn't restart on every route change; routes loop
 * gently via CSS rather than freezing after one draw.
 */
export function RouteBackdrop() {
  return (
    <svg
      viewBox="0 0 300 240"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none fixed inset-0 h-full w-full opacity-[0.14]"
      aria-hidden="true"
    >
      {AMBIENT_ROUTES.map(({ play, depth, x, y, delay }, i) => (
        <g key={i} transform={`translate(${x}, ${y - 70})`}>
          <path
            d={routePath(play, depth)}
            fill="none"
            stroke="#10D688"
            strokeWidth={1.6}
            strokeLinecap="round"
            pathLength={1}
            className="route-backdrop-line"
            style={{ animationDelay: `${delay}ms` }}
          />
          <circle cx={44} cy={70} r={3} fill="#10D688" />
        </g>
      ))}
    </svg>
  );
}
