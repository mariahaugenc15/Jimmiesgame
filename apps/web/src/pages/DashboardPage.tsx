import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { LockButton } from "../components/LockButton";

interface TeamRow {
  id: string;
  name: string;
  seasonId: string;
  lockedAt: string | null;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<{ id: string; year: number }[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamName, setTeamName] = useState("My Fantasy Squad");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rosterCount, setRosterCount] = useState<number | null>(null);

  const myTeam = teams.find((t) => !t.name.startsWith("Bot Squad"));
  const botTeams = teams.filter((t) => t.name.startsWith("Bot Squad"));

  async function refresh() {
    const [seasonList, teamList] = await Promise.all([api.seasons(), api.myTeams()]);
    setSeasons(seasonList);
    setTeams(teamList);
    const mine = teamList.find((t) => !t.name.startsWith("Bot Squad"));
    if (mine) {
      const roster = await api.roster(mine.id);
      setRosterCount(roster.length);
    } else {
      setRosterCount(null);
    }
  }

  useEffect(() => {
    refresh().catch((err) => setStatus(err instanceof ApiError ? err.message : "Failed to load."));
  }, []);

  async function createTeam() {
    if (!seasons[0]) return;
    setBusy(true);
    try {
      await api.createTeam(teamName, seasons[0].id);
      await refresh();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to create team.");
    } finally {
      setBusy(false);
    }
  }

  async function runSoloDraft() {
    if (!myTeam) return;
    setBusy(true);
    setStatus("Drafting your roster against 5 bots…");
    try {
      await api.runSoloDraft(myTeam.id, myTeam.seasonId, 5);
      await refresh();
      setStatus("Draft complete! Your roster is ready.");
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Draft failed.");
    } finally {
      setBusy(false);
    }
  }

  async function playVsBot(botTeamId: string) {
    if (!myTeam) return;
    try {
      const match = await api.createMatch(myTeam.id, botTeamId, 1);
      await api.startMatch(match.id);
      navigate(`/match/${match.id}?team=${myTeam.id}`);
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Could not start match.");
      throw err;
    }
  }

  async function joinMatchmaking() {
    if (!myTeam) return;
    setBusy(true);
    setStatus("Searching for an opponent…");
    try {
      const result = await api.joinMatchmaking(myTeam.id);
      if (result.status === "matched" && result.match) {
        await api.startMatch(result.match.id);
        navigate(`/match/${result.match.id}?team=${myTeam.id}`);
      } else {
        setStatus(`Waiting in queue (${result.queueSize ?? 0} others waiting)…`);
      }
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Matchmaking failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
      <h1 className="text-xl font-bold text-emerald-400">Dashboard</h1>
      {status && <p className="rounded-md bg-slate-900 p-3 text-sm text-slate-300">{status}</p>}

      {!myTeam && (
        <div className="rounded-xl bg-slate-900 p-4">
          <h2 className="mb-2 font-semibold">Create your team</h2>
          <div className="flex gap-2">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm"
            />
            <button
              onClick={createTeam}
              disabled={busy || seasons.length === 0}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {myTeam && (
        <div className="rounded-xl bg-slate-900 p-4">
          <h2 className="mb-2 font-semibold">{myTeam.name}</h2>
          <p className="mb-3 text-sm text-slate-400">
            {rosterCount === null ? "Loading roster…" : rosterCount > 0 ? `Roster set: ${rosterCount} players` : "No roster yet."}
            {myTeam.lockedAt && " · Locked for the season"}
          </p>
          {(rosterCount ?? 0) === 0 && (
            <button
              onClick={runSoloDraft}
              disabled={busy}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              Run Solo Draft (vs 5 bots)
            </button>
          )}
        </div>
      )}

      {myTeam && (rosterCount ?? 0) > 0 && (
        <>
          <div className="rounded-xl bg-slate-900 p-4">
            <h2 className="mb-2 font-semibold">Quick Match</h2>
            <button
              onClick={joinMatchmaking}
              disabled={busy}
              className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              Find a global opponent
            </button>
          </div>

          <div className="rounded-xl bg-slate-900 p-4">
            <h2 className="mb-2 font-semibold">Play against a bot</h2>
            <div className="space-y-2">
              {botTeams.map((bot) => (
                <div key={bot.id} className="flex items-center justify-between rounded-md bg-slate-800 px-4 py-2">
                  <span className="text-sm">{bot.name}</span>
                  <LockButton label="Lock In Lineup" onConfirm={() => playVsBot(bot.id)} className="px-3 py-1 text-xs" />
                </div>
              ))}
              {botTeams.length === 0 && <p className="text-sm text-slate-500">No bot opponents yet.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
