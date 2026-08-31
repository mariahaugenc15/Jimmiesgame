import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

export function LeaguesPage() {
  const [leagueName, setLeagueName] = useState("My League");
  const [leagueId, setLeagueId] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [standings, setStandings] = useState<{ teamName: string; wins: number; losses: number; ties: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ username: string; skillRating: number }[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    api
      .myTeams()
      .then((teams) => setTeamId(teams.find((t) => !t.name.startsWith("Bot Squad"))?.id ?? null))
      .catch(() => {});
    api
      .globalLeaderboard()
      .then(setLeaderboard)
      .catch(() => {});
  }, []);

  async function createLeague() {
    try {
      const league = await api.createLeague(leagueName, true);
      setLeagueId(league.id);
      setStatus(`Created league. ID: ${league.id}`);
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to create league.");
    }
  }

  async function joinAndLoad() {
    if (!teamId || !leagueId) return;
    try {
      await api.joinLeague(leagueId, teamId);
      const rows = await api.standings(leagueId);
      setStandings(rows);
      setStatus("Joined league.");
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to join league.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
      <h1 className="text-xl font-bold text-emerald-400">Leagues</h1>
      {status && <p className="rounded-md bg-slate-900 p-3 text-sm text-slate-300">{status}</p>}

      <div className="rounded-xl bg-slate-900 p-4">
        <h2 className="mb-2 font-semibold">Create a private league</h2>
        <div className="flex gap-2">
          <input
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm"
          />
          <button onClick={createLeague} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-600">
            Create
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 p-4">
        <h2 className="mb-2 font-semibold">Join a league</h2>
        <div className="flex gap-2">
          <input
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            placeholder="League ID"
            className="flex-1 rounded-md bg-slate-800 px-3 py-2 text-sm"
          />
          <button onClick={joinAndLoad} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700">
            Join &amp; view standings
          </button>
        </div>
        {standings.length > 0 && (
          <table className="mt-3 w-full text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="text-left">Team</th>
                <th>W</th>
                <th>L</th>
                <th>T</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <tr key={row.teamName}>
                  <td>{row.teamName}</td>
                  <td className="text-center">{row.wins}</td>
                  <td className="text-center">{row.losses}</td>
                  <td className="text-center">{row.ties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl bg-slate-900 p-4">
        <h2 className="mb-2 font-semibold">Global leaderboard</h2>
        <ol className="space-y-1 text-sm">
          {leaderboard.map((row, i) => (
            <li key={row.username} className="flex justify-between">
              <span>
                {i + 1}. {row.username}
              </span>
              <span className="text-slate-400">{row.skillRating}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
