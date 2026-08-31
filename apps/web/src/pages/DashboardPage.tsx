import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { LockButton } from "../components/LockButton";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { buttonPrimary, POSITION_STYLES } from "../lib/ui";
import { DashboardIcon } from "../components/navIcons";

interface TeamRow {
  id: string;
  name: string;
  seasonId: string;
  lockedAt: string | null;
}

interface RosterEntry {
  nflPlayerId: string;
  rosterPosition: string;
  draftRound: number;
  player: { name: string; position: string; realNflTeam: string } | null;
}

function RosterSummaryStrip({ roster }: { roster: RosterEntry[] }) {
  const starters = roster.filter((r) => r.rosterPosition !== "BENCH");
  const benchCount = roster.length - starters.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {starters.map((slot) => (
        <span
          key={slot.nflPlayerId}
          title={slot.player?.name ?? slot.rosterPosition}
          className={`rounded-md border px-2 py-1 text-[11px] font-bold ${POSITION_STYLES[slot.rosterPosition] ?? POSITION_STYLES.BENCH}`}
        >
          {slot.rosterPosition}
        </span>
      ))}
      {benchCount > 0 && (
        <span className="rounded-md border border-surface-border bg-surface-page px-2 py-1 text-[11px] font-semibold text-slate-500">
          +{benchCount} bench
        </span>
      )}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<{ id: string; year: number }[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamName, setTeamName] = useState("My Fantasy Squad");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);

  const myTeam = teams.find((t) => !t.name.startsWith("Bot Squad"));
  const botTeams = teams.filter((t) => t.name.startsWith("Bot Squad"));
  const rosterCount = roster?.length ?? null;

  async function refresh() {
    const [seasonList, teamList] = await Promise.all([api.seasons(), api.myTeams()]);
    setSeasons(seasonList);
    setTeams(teamList);
    const mine = teamList.find((t) => !t.name.startsWith("Bot Squad"));
    if (mine) {
      setRoster(await api.roster(mine.id));
    } else {
      setRoster(null);
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
    <div className="mx-auto max-w-6xl space-y-5 p-4 pb-24 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400">
          <DashboardIcon />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-slate-500">Your team, your matchups, your season.</p>
        </div>
      </div>

      {status && (
        <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm text-slate-300">
          {status}
        </div>
      )}

      {!myTeam && (
        <Card elevated className="p-6">
          <SectionHeader title="Start here" subtitle="Create your team to unlock the draft, matchups, and everything else." />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="flex-1 rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
            />
            <button onClick={createTeam} disabled={busy || seasons.length === 0} className={buttonPrimary}>
              Create team
            </button>
          </div>
        </Card>
      )}

      {myTeam && rosterCount === 0 && (
        <Card elevated className="p-6">
          <SectionHeader title="Start here" subtitle={`${myTeam.name} has no roster yet — draft one to unlock matchups.`} />
          <button onClick={runSoloDraft} disabled={busy} className={buttonPrimary}>
            Run Solo Draft (vs 5 bots)
          </button>
        </Card>
      )}

      {myTeam && rosterCount !== null && rosterCount > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-white">{myTeam.name}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {rosterCount} players rostered{myTeam.lockedAt && " · Locked for the season"}
                  </p>
                </div>
                {myTeam.lockedAt && (
                  <span className="rounded-full border border-locked-500/40 bg-locked-500/10 px-2.5 py-1 text-[11px] font-semibold text-locked-300">
                    Locked
                  </span>
                )}
              </div>
              <div className="mt-3">
                <RosterSummaryStrip roster={roster ?? []} />
              </div>
            </Card>

            <Card elevated className="p-6">
              <SectionHeader title="Quick Match" subtitle="Jump into a ranked matchup against another real team." />
              <button onClick={joinMatchmaking} disabled={busy} className={`${buttonPrimary} w-full text-base`}>
                Find a global opponent
              </button>
            </Card>
          </div>

          <Card className="p-5 lg:col-span-1">
            <SectionHeader title="Play against a bot" />
            <div className="space-y-2">
              {botTeams.map((bot) => (
                <div
                  key={bot.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-page px-3 py-2 transition-colors hover:border-primary-500/30"
                >
                  <span className="text-sm text-slate-300">{bot.name}</span>
                  <LockButton label="Lock In Lineup" onConfirm={() => playVsBot(bot.id)} className="px-3 py-1.5 text-xs" />
                </div>
              ))}
              {botTeams.length === 0 && <p className="text-sm text-slate-500">No bot opponents yet.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
