import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { LockButton } from "../components/LockButton";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { PlayerCard } from "../components/ui/PlayerCard";
import { RosterIcon } from "../components/navIcons";
import { buttonSecondary } from "../lib/ui";

interface RosterEntry {
  nflPlayerId: string;
  rosterPosition: string;
  draftRound: number;
  player: { name: string; position: string; realNflTeam: string } | null;
}

interface RatedPlayer {
  id: string;
  name: string;
  position: string;
  realNflTeam: string;
  rating: { overall: number } | null;
}

const SLOT_ORDER = ["QB", "RB", "WR", "TE", "FLEX", "DEF", "K", "BENCH"];

export function RosterPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [allPlayers, setAllPlayers] = useState<RatedPlayer[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  async function load() {
    const teams = await api.myTeams();
    const mine = teams.find((t) => !t.name.startsWith("Bot Squad"));
    if (!mine) return;
    setTeamId(mine.id);
    setLocked(Boolean(mine.lockedAt));
    const [rosterData, players] = await Promise.all([api.roster(mine.id), api.players()]);
    setRoster(rosterData);
    setAllPlayers(players);
  }

  useEffect(() => {
    load().catch((err) => setStatus(err instanceof ApiError ? err.message : "Failed to load roster."));
  }, []);

  const rosteredIds = new Set(roster.map((r) => r.nflPlayerId));
  const ratingById = new Map(allPlayers.map((p) => [p.id, p.rating?.overall ?? null]));

  async function swap(dropPlayerId: string, position: string) {
    if (!teamId) return;
    const replacement = allPlayers
      .filter((p) => p.position === position && !rosteredIds.has(p.id))
      .sort((a, b) => (b.rating?.overall ?? 0) - (a.rating?.overall ?? 0))[0];
    if (!replacement) {
      setStatus(`No available ${position} to swap in.`);
      throw new Error("no replacement available");
    }
    try {
      await api.swapPlayer(teamId, dropPlayerId, replacement.id);
      setStatus(`Swapped in ${replacement.name}.`);
      await load();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Swap failed.");
      throw err;
    }
  }

  async function confirmLockRoster() {
    if (!teamId) return;
    try {
      await api.lockTeam(teamId);
      setLocked(true);
      setStatus("Roster Locked In for the Season");
      setShowLockConfirm(false);
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Lock failed.");
      throw err;
    }
  }

  const starters = SLOT_ORDER.filter((s) => s !== "BENCH").flatMap((slot) =>
    roster.filter((r) => r.rosterPosition === slot),
  );
  const bench = roster.filter((r) => r.rosterPosition === "BENCH");

  function renderCard(entry: RosterEntry) {
    return (
      <PlayerCard
        key={entry.draftRound}
        name={entry.player?.name ?? "Unknown"}
        position={entry.player?.position ?? "—"}
        slot={entry.rosterPosition}
        team={entry.player?.realNflTeam ?? ""}
        overall={entry.player ? (ratingById.get(entry.nflPlayerId) ?? null) : null}
        action={
          !locked && entry.player ? (
            <LockButton
              label="Lock In Pick"
              lockedLabel="Locked"
              resetAfterMs={1500}
              onConfirm={() => swap(entry.nflPlayerId, entry.player!.position)}
              className="shrink-0 px-2.5 py-1.5 text-[11px]"
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 pb-24 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400">
            <RosterIcon />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">My Roster</h1>
            <p className="text-sm text-slate-500">Manage your lineup before it locks for the season.</p>
          </div>
        </div>
        {!locked && teamId && roster.length > 0 && (
          <button
            onClick={() => setShowLockConfirm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-locked-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-all hover:bg-locked-500 active:scale-[0.98]"
          >
            Lock In Your Roster
          </button>
        )}
        {locked && (
          <span className="rounded-full border border-locked-500/40 bg-locked-500/10 px-3 py-1.5 text-xs font-semibold text-locked-300">
            Locked for season
          </span>
        )}
      </div>

      {status && (
        <div className="rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm text-slate-300">
          {status}
        </div>
      )}

      {roster.length === 0 && (
        <Card elevated className="p-6">
          <SectionHeader title="No roster yet" subtitle="Run a solo draft from the Dashboard first to build your lineup." />
        </Card>
      )}

      {roster.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card elevated className="p-5 lg:col-span-3">
            <SectionHeader title="Starting lineup" subtitle="Your active roster slots for this matchup." />
            <div className="space-y-2">{starters.map(renderCard)}</div>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <SectionHeader title="Bench" subtitle={`${bench.length} reserves`} />
            <div className="space-y-2">{bench.map(renderCard)}</div>
          </Card>
        </div>
      )}

      {showLockConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
          <Card elevated className="w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-white">Ready to lock in?</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your roster is set for the entire season once you do. No trades or free agency after this point.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowLockConfirm(false)} className={buttonSecondary}>
                Cancel
              </button>
              <LockButton label="Lock In Your Roster" onConfirm={confirmLockRoster} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
