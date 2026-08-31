import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { DefensivePlay, GameState, OffensivePlay, PlayResult } from "@lockedin/shared";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { ScoreBoard } from "../components/ScoreBoard";
import { FieldView } from "../components/FieldView";
import { PlayCallPanel } from "../components/PlayCallPanel";
import { ProbabilityBar } from "../components/ProbabilityBar";
import { LockedInLogo } from "../components/LockedInLogo";

export function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get("team");

  const [state, setState] = useState<GameState | null>(null);
  const [lastResult, setLastResult] = useState<PlayResult | null>(null);
  const [selectedOffense, setSelectedOffense] = useState<OffensivePlay | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [waitingForResolution, setWaitingForResolution] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) return;
    const socket = connectSocket();
    socket.emit("match:join", { matchId });
    socket.on("match:state", (s: GameState) => {
      setState(s);
      setWaitingForResolution(false);
      setSelectedOffense(undefined);
    });
    socket.on("match:play-result", (r: PlayResult) => setLastResult(r));
    socket.on("match:error", (e: { error: string }) => setError(e.error));

    return () => {
      socket.emit("match:leave", { matchId });
      socket.off("match:state");
      socket.off("match:play-result");
      socket.off("match:error");
      disconnectSocket();
    };
  }, [matchId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [state?.log.length]);

  function submitPlay(play: OffensivePlay | DefensivePlay) {
    if (!matchId || !teamId) return;
    setWaitingForResolution(true);
    connectSocket().emit("match:playcall", { matchId, teamId, play }, (ack: { ok: boolean; error?: string }) => {
      if (!ack.ok) {
        setError(ack.error ?? "Play call failed.");
        setWaitingForResolution(false);
      }
    });
  }

  if (!matchId || !teamId) {
    return <p className="p-4 text-red-400">Missing match or team id in the URL.</p>;
  }

  if (!state) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <LockedInLogo mode="loop" size={48} showWordmark={false} />
        <p className="text-slate-400">Locking In…</p>
      </div>
    );
  }

  const possessionIsHome = state.possessionTeamId === state.homeTeamId;
  const isOffense = state.possessionTeamId === teamId;
  const isDefense = !isOffense && (teamId === state.homeTeamId || teamId === state.awayTeamId);
  const mode: "offense" | "defense" | "waiting" =
    state.phase === "final" ? "waiting" : isOffense ? "offense" : isDefense ? "defense" : "waiting";

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
      <ScoreBoard
        homeName="Home"
        awayName="Away"
        homeScore={state.homeScore}
        awayScore={state.awayScore}
        clock={state.clock}
        phase={state.phase}
      />

      <FieldView
        down={state.down}
        lastPlay={state.lastPlay}
        possessionIsHome={possessionIsHome}
        selectedOffensivePlay={selectedOffense}
      />

      {lastResult && (
        <div className="space-y-2 rounded-lg bg-slate-900 p-3">
          <ProbabilityBar label="Success probability" value={lastResult.successProbability} color="#38bdf8" />
          {lastResult.breakawayChance > 0 && (
            <ProbabilityBar label="Breakaway chance" value={lastResult.breakawayChance} color="#f97316" />
          )}
        </div>
      )}

      {error && <p className="rounded-md bg-red-950 p-3 text-sm text-red-300">{error}</p>}

      {state.phase === "final" ? (
        <div className="rounded-xl bg-slate-900 p-6 text-center">
          <p className="text-lg font-bold text-emerald-400">Final score</p>
          <p className="text-2xl font-bold">
            {state.homeScore} – {state.awayScore}
          </p>
        </div>
      ) : (
        <PlayCallPanel
          mode={mode}
          disabled={waitingForResolution}
          onSelectOffense={(play) => {
            setSelectedOffense(play);
            submitPlay(play);
          }}
          onSelectDefense={submitPlay}
        />
      )}

      <div ref={logRef} className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-400">
        {state.log.map((line, i) => (
          <p key={i}>{line.split(state.homeTeamId).join("Home").split(state.awayTeamId).join("Away")}</p>
        ))}
      </div>
    </div>
  );
}
