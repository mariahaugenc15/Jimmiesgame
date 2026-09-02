import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { LeaguesIcon } from "../components/navIcons";
import { buttonPrimary, buttonSecondary, buttonTertiary } from "../lib/ui";

interface LeagueRow {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface StandingRow {
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
}

/** Gold/silver/bronze by rank, drawn as a plain colored badge (not an emoji medal) so it matches the rest of the app's custom-styled icon system. */
function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "border-[#facc15]/50 bg-[#facc15]/15 text-[#facc15]"
      : rank === 2
        ? "border-slate-300/50 bg-slate-300/15 text-slate-300"
        : rank === 3
          ? "border-[#d08a4f]/50 bg-[#d08a4f]/15 text-[#d08a4f]"
          : "border-surface-border bg-surface-page text-slate-500";
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${style}`}>
      {rank}
    </span>
  );
}

/** A clickable invite link beats asking someone to copy-paste a raw league ID into a text field - this is how you invite people to a league. */
function inviteLinkFor(leagueId: string): string {
  return `${window.location.origin}/join-league/${leagueId}`;
}

/** Accepts either a raw league ID or a full invite link pasted in whole - pulls the ID back out either way. */
function extractLeagueId(input: string): string {
  const trimmed = input.trim();
  const marker = "/join-league/";
  const i = trimmed.lastIndexOf(marker);
  return i === -1 ? trimmed : trimmed.slice(i + marker.length);
}

function CopyInviteLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(inviteLinkFor(id));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard access can be denied - the link is still visible to select/copy by hand once expanded.
        }
      }}
      className={`${buttonTertiary} border border-surface-border`}
    >
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  );
}

export function LeaguesPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState("My League");
  const [joinInput, setJoinInput] = useState("");
  const [myLeagues, setMyLeagues] = useState<LeagueRow[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<LeagueRow | null>(null);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ username: string; skillRating: number }[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadMyLeagues(tid: string) {
    const rows = await api.myLeagues(tid);
    setMyLeagues(rows);
    return rows;
  }

  useEffect(() => {
    api
      .myTeams()
      .then(async (teams) => {
        const mine = teams.find((t) => !t.name.startsWith("Bot Squad"));
        if (!mine) return;
        setTeamId(mine.id);
        await loadMyLeagues(mine.id);
      })
      .catch(() => {});
    api
      .globalLeaderboard()
      .then(setLeaderboard)
      .catch(() => {});
  }, []);

  async function viewStandings(league: LeagueRow) {
    setSelectedLeague(league);
    try {
      const rows = await api.standings(league.id);
      setStandings(rows);
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Couldn't load standings.");
    }
  }

  async function createLeague() {
    if (!teamId) return;
    setBusy(true);
    try {
      const league = await api.createLeague(leagueName, true);
      await api.joinLeague(league.id, teamId);
      await loadMyLeagues(teamId);
      setStatus(`Created "${league.name}" and joined it with your team.`);
      setLeagueName("My League");
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to create league.");
    } finally {
      setBusy(false);
    }
  }

  async function joinByInput() {
    if (!teamId || !joinInput.trim()) return;
    const leagueId = extractLeagueId(joinInput);
    setBusy(true);
    try {
      await api.joinLeague(leagueId, teamId);
      const rows = await loadMyLeagues(teamId);
      const joined = rows.find((r) => r.id === leagueId);
      setJoinInput("");
      setStatus(joined ? `Joined "${joined.name}".` : "Joined league.");
      if (joined) await viewStandings(joined);
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to join league.");
    } finally {
      setBusy(false);
    }
  }

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
          {myLeagues.length > 0 && (
            <Card elevated className="p-5">
              <SectionHeader title="Your leagues" subtitle="Leagues your team is already in." />
              <div className="space-y-2">
                {myLeagues.map((league) => (
                  <div
                    key={league.id}
                    className={`rounded-lg border px-3 py-2.5 transition-colors ${
                      selectedLeague?.id === league.id
                        ? "border-primary-500/50 bg-primary-500/5"
                        : "border-surface-border bg-surface-page"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">{league.name}</p>
                      <div className="flex items-center gap-2">
                        <CopyInviteLinkButton id={league.id} />
                        <button onClick={() => viewStandings(league)} className={buttonSecondary}>
                          View standings
                        </button>
                      </div>
                    </div>

                    {selectedLeague?.id === league.id && (
                      <div className="mt-3 border-t border-surface-border pt-3">
                        {standings.length === 0 ? (
                          <p className="text-sm text-slate-500">No completed matches in this league yet.</p>
                        ) : (
                          <table className="w-full text-sm">
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card elevated className="p-6">
            <SectionHeader title="Create a private league" subtitle="You're auto-joined, then share the invite link with friends." />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="flex-1 rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
              />
              <button onClick={createLeague} disabled={busy || !teamId} className={buttonPrimary}>
                Create league
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader title="Join a league" subtitle="Paste an invite link (or just the league ID) a friend shared with you." />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Invite link or league ID"
                className="flex-1 rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
              />
              <button onClick={joinByInput} disabled={busy || !teamId} className={buttonSecondary}>
                Join &amp; view standings
              </button>
            </div>
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
                    <RankBadge rank={i + 1} />
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
