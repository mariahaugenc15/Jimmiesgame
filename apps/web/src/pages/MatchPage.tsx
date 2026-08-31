import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { DefensivePlay, GameState, OffensivePlay } from "@lockedin/shared";
import { ApiError, api } from "../lib/api";
import { ScoreBoard } from "../components/ScoreBoard";
import { FieldView } from "../components/FieldView";
import { PlayCallPanel } from "../components/PlayCallPanel";
import { ProbabilityBar } from "../components/ProbabilityBar";
import { LockedInLogo } from "../components/LockedInLogo";
import { PlayDiagram } from "../components/playdiagram/PlayDiagram";
import { HowToPlay } from "../components/HowToPlay";

// Vercel's hosting runs the server in short-lived, disconnected pieces
// rather than one continuously-running process, so a WebSocket connection
// (which needs the same process to stay reachable for the whole match)
// doesn't work reliably there. Polling the current state over plain HTTP
// works the same way regardless of how the server is hosted.
const POLL_INTERVAL_MS = 1500;

export function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get("team");

  const [state, setState] = useState<GameState | null>(null);
  const [selectedOffense, setSelectedOffense] = useState<OffensivePlay | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [waitingForResolution, setWaitingForResolution] = useState(false);
  const [teamNames, setTeamNames] = useState<{ home: string; away: string }>({ home: "Home", away: "Away" });
  const logRef = useRef<HTMLDivElement>(null);
  const lastLogLengthRef = useRef(0);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    function applyState(s: GameState) {
      if (cancelled) return;
      if (s.log.length !== lastLogLengthRef.current || s.phase === "final") {
        lastLogLengthRef.current = s.log.length;
        setWaitingForResolution(false);
        setSelectedOffense(undefined);
      }
      setState(s);
      if (s.phase === "final" && interval) clearInterval(interval);
    }

    api
      .getMatchState(matchId)
      .then(applyState)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load the match."));

    interval = setInterval(() => {
      api
        .getMatchState(matchId)
        .then(applyState)
        .catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [matchId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [state?.log.length]);

  useEffect(() => {
    if (!state) return;
    Promise.all([api.getTeam(state.homeTeamId), api.getTeam(state.awayTeamId)])
      .then(([home, away]) => setTeamNames({ home: home.name, away: away.name }))
      .catch(() => {});
  }, [state?.homeTeamId, state?.awayTeamId]);

  async function submitPlay(play: OffensivePlay | DefensivePlay) {
    if (!matchId || !teamId) return;
    setWaitingForResolution(true);
    setError(null);
    try {
      const result = await api.submitPlayCall(matchId, teamId, play);
      if (result.state.log.length !== lastLogLengthRef.current || result.state.phase === "final") {
        lastLogLengthRef.current = result.state.log.length;
        setWaitingForResolution(false);
        setSelectedOffense(undefined);
      }
      setState(result.state);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Play call failed.");
      setWaitingForResolution(false);
    }
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
        homeName={teamNames.home}
        awayName={teamNames.away}
        homeScore={state.homeScore}
        awayScore={state.awayScore}
        clock={state.clock}
        phase={state.phase}
      />

      {state.phase !== "final" && <HowToPlay />}

      <FieldView
        down={state.down}
        lastPlay={state.lastPlay}
        possessionIsHome={possessionIsHome}
        selectedOffensivePlay={selectedOffense}
      />

      {state.lastPlay && (
        <div className="space-y-3">
          <PlayDiagram key={state.log.length} play={state.lastPlay.offensivePlay} result={state.lastPlay} />
          <div className="space-y-2 rounded-lg bg-surface-card p-3">
            <ProbabilityBar label="Success probability" value={state.lastPlay.successProbability} color="#38bdf8" />
            {state.lastPlay.breakawayChance > 0 && (
              <ProbabilityBar label="Breakaway chance" value={state.lastPlay.breakawayChance} color="#f97316" />
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-danger-500/30 bg-danger-500/10 p-3 text-sm text-danger-300">{error}</p>
      )}

      {state.phase === "final" ? (
        <div className="rounded-xl border border-primary-500/30 bg-surface-raised p-6 text-center shadow-raised">
          <p className="text-lg font-bold text-primary-400">Final score</p>
          <p className="mt-1 text-2xl font-extrabold text-white">
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

      <div
        ref={logRef}
        className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-surface-border bg-surface-card p-3 text-xs text-slate-400"
      >
        {state.log.map((line, i) => (
          <p key={i}>{line.split(state.homeTeamId).join(teamNames.home).split(state.awayTeamId).join(teamNames.away)}</p>
        ))}
      </div>
    </div>
  );
}
