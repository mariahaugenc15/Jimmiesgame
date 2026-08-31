import type { DownState, OffensivePlay, PlayResult } from "@lockedin/shared";

interface FieldViewProps {
  down: DownState | null;
  lastPlay: PlayResult | null;
  possessionIsHome: boolean;
  selectedOffensivePlay?: OffensivePlay;
}

const FIELD_WIDTH = 600;
const FIELD_HEIGHT = 220;
const MARGIN = 20;

function yardToX(yard: number): number {
  return MARGIN + (yard / 100) * (FIELD_WIDTH - MARGIN * 2);
}

/** Formation spread widens for pass concepts, tightens for runs — a purely diagrammatic cue, not simulated player movement. */
function formationOffsets(play?: OffensivePlay): number[] {
  switch (play) {
    case "deep_pass":
      return [-70, -35, 0, 35, 70];
    case "short_pass":
    case "screen_pass":
      return [-50, -20, 0, 20, 50];
    case "play_action":
      return [-40, -15, 0, 15, 40];
    default:
      return [-25, -10, 0, 10, 25];
  }
}

export function FieldView({ down, lastPlay, possessionIsHome, selectedOffensivePlay }: FieldViewProps) {
  if (!down) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-pitch text-slate-300">
        Locked In and Ready — waiting for kickoff…
      </div>
    );
  }

  const losX = yardToX(down.yardLine);
  const firstDownX = yardToX(Math.min(100, down.yardLine + down.yardsToGo));
  const centerY = FIELD_HEIGHT / 2;
  const offsets = formationOffsets(selectedOffensivePlay);
  const direction = possessionIsHome ? 1 : -1;

  return (
    <div className="rounded-xl bg-pitch p-3">
      <svg viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`} className="w-full">
        {/* yard lines */}
        {Array.from({ length: 11 }, (_, i) => i * 10).map((yard) => (
          <line
            key={yard}
            x1={yardToX(yard)}
            y1={10}
            x2={yardToX(yard)}
            y2={FIELD_HEIGHT - 10}
            stroke="#1f6b3f"
            strokeWidth={1}
          />
        ))}
        {/* end zones */}
        <rect x={0} y={0} width={MARGIN} height={FIELD_HEIGHT} fill="#062b18" />
        <rect x={FIELD_WIDTH - MARGIN} y={0} width={MARGIN} height={FIELD_HEIGHT} fill="#062b18" />

        {/* first down marker */}
        <line x1={firstDownX} y1={5} x2={firstDownX} y2={FIELD_HEIGHT - 5} stroke="#facc15" strokeWidth={2} />
        {/* line of scrimmage */}
        <line x1={losX} y1={5} x2={losX} y2={FIELD_HEIGHT - 5} stroke="#38bdf8" strokeWidth={2} />

        {/* abstract formation: geometric markers, not simulated players */}
        {offsets.map((dy, i) => (
          <circle
            key={i}
            cx={losX - direction * (i === 2 ? 14 : 6)}
            cy={centerY + dy}
            r={i === 2 ? 7 : 5}
            fill={i === 2 ? "#f8fafc" : "#94a3b8"}
          />
        ))}

        {/* last play direction/gain arrow */}
        {lastPlay && (
          <line
            x1={losX}
            y1={centerY}
            x2={yardToX(down.yardLine)}
            y2={centerY}
            stroke={lastPlay.type === "gain" || lastPlay.type === "touchdown" ? "#22c55e" : "#ef4444"}
            strokeWidth={4}
            markerEnd="url(#arrowhead)"
          />
        )}

        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#22c55e" />
          </marker>
        </defs>
      </svg>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
        <span>
          {down.down === 1 ? "1st" : down.down === 2 ? "2nd" : down.down === 3 ? "3rd" : "4th"} &amp;{" "}
          {down.yardsToGo} at the {down.yardLine}
        </span>
        {lastPlay && (
          <span className="font-mono">
            {lastPlay.type.toUpperCase()} {lastPlay.yards >= 0 ? "+" : ""}
            {lastPlay.yards} yds
          </span>
        )}
      </div>
    </div>
  );
}
