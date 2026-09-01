import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import type { DefensivePlay, GameState, OffensivePlay } from "@lockedin/shared";
import { ApiError, api } from "../lib/api";
import { ScoreBoard } from "../components/ScoreBoard";
import { FieldPositionTracker } from "../components/FieldPositionTracker";
import { PlayCallPanel } from "../components/PlayCallPanel";
import { ProbabilityBar } from "../components/ProbabilityBar";
import { LockedInLogo } from "../components/LockedInLogo";
import { PlayTheater } from "../components/playdiagram/PlayTheater";
import { HowToPlay } from "../components/HowToPlay";
import type { InsightPlayer } from "../lib/playInsights";

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
  const [teamIcons, setTeamIcons] = useState<{ home: string | null; away: string | null }>({ home: null, away: null });
  const [playerById, setPlayerById] = useState<Map<string, InsightPlayer>>(new Map());
  const [myRoster, setMyRoster] = useState<InsightPlayer[]>([]);
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
      .then(([home, away]) => {
        setTeamNames({ home: home.name, away: away.name });
        setTeamIcons({ home: home.icon, away: away.icon });
      })
      .catch(() => {});
  }, [state?.homeTeamId, state?.awayTeamId]);

  // Both rosters (with real ratings) drive the play-theater's player labels
  // and the play-call panel's insight hints. Fetched once per match, not on
  // every poll - team/home/away ids never change once a match has started.
  useEffect(() => {
    if (!state) return;
    Promise.all([api.players(), api.roster(state.homeTeamId), api.roster(state.awayTeamId)])
      .then(([players, homeRoster, awayRoster]) => {
        const ratingById = new Map(players.map((p) => [p.id, p.rating]));
        const toInsightPlayers = (roster: typeof homeRoster): InsightPlayer[] =>
          roster
            .filter((entry) => entry.player)
            .map((entry) => ({
              id: entry.nflPlayerId,
              name: entry.player!.name,
              position: entry.player!.position,
              rating: ratingById.get(entry.nflPlayerId) ?? null,
            }));

        const home = toInsightPlayers(homeRoster);
        const away = toInsightPlayers(awayRoster);
        const merged = new Map<string, InsightPlayer>();
        for (const p of [...home, ...away]) merged.set(p.id, p);
        setPlayerById(merged);
        setMyRoster(teamId === state.homeTeamId ? home : away);
      })
      .catch(() => {});
  }, [state?.homeTeamId, state?.awayTeamId, teamId]);

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

  const isHomeMine = teamId === state.homeTeamId;
  const possessionIsHome = state.possessionTeamId ? state.possessionTeamId === state.homeTeamId : null;
  const isOffense = state.possessionTeamId === teamId;
  const isDefense = !isOffense && (teamId === state.homeTeamId || teamId === state.awayTeamId);
  const mode: "offense" | "defense" | "waiting" =
    state.phase === "final" ? "waiting" : isOffense ? "offense" : isDefense ? "defense" : "waiting";
  const featuredPlayer = state.lastPlay
    ? (playerById.get(state.lastPlay.ballCarrierId ?? state.lastPlay.targetId ?? "") ?? null)
    : null;
  const offenseIcon =
    state.possessionTeamId === state.homeTeamId
      ? teamIcons.home
      : state.possessionTeamId === state.awayTeamId
        ? teamIcons.away
        : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 pb-24 sm:p-6">
      <ScoreBoard
        homeName={teamNames.home}
        awayName={teamNames.away}
        homeIcon={teamIcons.home}
        awayIcon={teamIcons.away}
        homeScore={state.homeScore}
        awayScore={state.awayScore}
        clock={state.clock}
        phase={state.phase}
        isHomeMine={isHomeMine}
        possessionIsHome={possessionIsHome}
      />

      {state.phase !== "final" && <HowToPlay />}

      {/* The play theater is the single largest element on the screen - a
          continuous field that goes from pre-snap waiting to animated
          route/ball-carrier development to outcome, not two separate
          panels. Remounted per resolved play so its animation replays. */}
      <PlayTheater
        key={state.log.length}
        down={state.down}
        lastPlay={state.lastPlay}
        selectedOffensivePlay={selectedOffense}
        player={featuredPlayer}
        offenseIcon={offenseIcon}
      />

      {state.lastPlay && (
        <div className="space-y-2 rounded-lg border border-surface-border bg-surface-card p-3">
          <ProbabilityBar label="Success probability" value={state.lastPlay.successProbability} />
          {state.lastPlay.breakawayChance > 0 && (
            <ProbabilityBar label="Breakaway chance" value={state.lastPlay.breakawayChance} color="#f97316" />
          )}
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
          roster={myRoster}
          onSelectOffense={(play) => {
            setSelectedOffense(play);
            submitPlay(play);
          }}
          onSelectDefense={submitPlay}
        />
      )}

      <FieldPositionTracker down={state.down} />

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
