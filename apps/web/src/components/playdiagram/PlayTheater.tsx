import type { DownState, OffensivePlay, PlayResult } from "@lockedin/shared";
import { DoodleFigure } from "./DoodleFigure";
import { FieldBackground } from "./FieldBackground";
import { PlayDiagram } from "./PlayDiagram";
import { OutcomeCallout } from "./OutcomeCallout";
import { DEFENDER_SPOTS, FIELD_H, FIELD_W, LOS_X } from "./routes";
import type { InsightPlayer } from "../../lib/playInsights";

interface PlayTheaterProps {
  down: DownState | null;
  lastPlay: PlayResult | null;
  selectedOffensivePlay?: OffensivePlay;
  player: InsightPlayer | null;
}

/** Formation spread widens for pass concepts, tightens for runs — a purely diagrammatic cue, not simulated player movement. */
function formationOffsets(play?: OffensivePlay): number[] {
  switch (play) {
    case "deep_pass":
      return [-50, -25, 0, 25, 50];
    case "short_pass":
    case "screen_pass":
      return [-38, -16, 0, 16, 38];
    case "play_action":
      return [-30, -12, 0, 12, 30];
    default:
      return [-20, -8, 0, 8, 20];
  }
}

function downLabel(down: number): string {
  return down === 1 ? "1st" : down === 2 ? "2nd" : down === 3 ? "3rd" : "4th";
}

function PreSnapField({ down, selectedOffensivePlay }: { down: DownState; selectedOffensivePlay?: OffensivePlay }) {
  const offsets = formationOffsets(selectedOffensivePlay);
  const centerY = FIELD_H / 2;

  return (
    <div className="overflow-hidden rounded-xl bg-pitch p-3">
      <svg viewBox={`0 0 ${FIELD_W} ${FIELD_H}`} className="w-full">
        <FieldBackground />

        {DEFENDER_SPOTS.map(([x, y], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <DoodleFigure variant="defense" size={4.5} />
          </g>
        ))}

        {offsets.map((dy, i) => (
          <g key={i} transform={`translate(${LOS_X - (i === 2 ? 14 : 6)},${centerY + dy})`}>
            <DoodleFigure variant="offense" size={i === 2 ? 6.5 : 5} />
          </g>
        ))}
      </svg>
      <div className="mt-2 text-xs text-slate-400">
        {downLabel(down.down)} &amp; {down.yardsToGo} at the {down.yardLine} — waiting for the snap
      </div>
    </div>
  );
}

/**
 * The single, largest panel on the gameplay screen: pre-snap it shows the
 * waiting formation, and once a play resolves it becomes the animated
 * route/ball-carrier development topped with the big transient outcome
 * callout - one continuous field, not two disconnected panels. Remount this
 * with a key tied to the resolved-play count (see MatchPage) so the
 * animation and callout replay fresh for every new play.
 */
export function PlayTheater({ down, lastPlay, selectedOffensivePlay, player }: PlayTheaterProps) {
  if (!down) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl bg-pitch text-slate-300">
        Locked In and Ready — waiting for kickoff…
      </div>
    );
  }

  if (!lastPlay) {
    return <PreSnapField down={down} selectedOffensivePlay={selectedOffensivePlay} />;
  }

  return (
    <div className="relative">
      <PlayDiagram play={lastPlay.offensivePlay} result={lastPlay} player={player} />
      <OutcomeCallout result={lastPlay} />
    </div>
  );
}
