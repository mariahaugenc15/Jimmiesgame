import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { LeaguesIcon } from "../components/navIcons";
import { buttonPrimary, buttonSecondary } from "../lib/ui";

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

  const medal = ["🥇", "🥈", "🥉"];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 pb-24 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400">
          <LeaguesIcon />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Leagues</h1>
          <p className="text-sm text-slate-500">Start a private league, join one, or check the global standings.</p>
        </div>
      </div>

      {status && (
        <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm text-slate-300">
          {status}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card elevated className="p-6">
            <SectionHeader title="Create a private league" subtitle="Invite friends with the league ID once it's created." />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="flex-1 rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
              />
              <button onClick={createLeague} className={buttonPrimary}>
                Create league
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Join a league" subtitle="Paste a league ID a friend shared with you." />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                placeholder="League ID"
                className="flex-1 rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
              />
              <button onClick={joinAndLoad} className={buttonSecondary}>
                Join &amp; view standings
              </button>
            </div>

            {standings.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Join a league to see its standings here.</p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 text-left font-semibold">Team</th>
                    <th className="pb-2 font-semibold text-primary-400">W</th>
                    <th className="pb-2 font-semibold text-danger-400">L</th>
                    <th className="pb-2 font-semibold text-slate-400">T</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {standings.map((row) => (
                    <tr key={row.teamName}>
                      <td className="py-2 font-medium text-slate-200">{row.teamName}</td>
                      <td className="py-2 text-center font-bold text-primary-300">{row.wins}</td>
                      <td className="py-2 text-center font-bold text-danger-300">{row.losses}</td>
                      <td className="py-2 text-center text-slate-400">{row.ties}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <Card className="p-5 lg:col-span-1">
          <SectionHeader title="Global leaderboard" subtitle="Ranked by skill rating across all players." />
          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-500">No ranked results yet — play a match to get on the board.</p>
          ) : (
            <ol className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {leaderboard.map((row, i) => (
                <li
                  key={row.username}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm ${
                    i < 3 ? "bg-surface-raised" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2 text-slate-200">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-500">{medal[i] ?? i + 1}</span>
                    <span className="truncate">{row.username}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-data-300">{row.skillRating}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
