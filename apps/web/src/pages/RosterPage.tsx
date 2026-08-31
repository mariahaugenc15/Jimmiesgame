import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { LockButton } from "../components/LockButton";

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

  const bySlot = SLOT_ORDER.flatMap((slot) => roster.filter((r) => r.rosterPosition === slot));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-emerald-400">My Roster</h1>
        {!locked && teamId && roster.length > 0 && (
          <button
            onClick={() => setShowLockConfirm(true)}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold hover:bg-amber-600"
          >
            Lock In Your Roster
          </button>
        )}
        {locked && <span className="text-sm text-amber-400">Locked for season</span>}
      </div>
      {status && <p className="rounded-md bg-slate-900 p-3 text-sm text-slate-300">{status}</p>}

      {roster.length === 0 && <p className="text-slate-400">No roster yet — run a solo draft from the Dashboard first.</p>}

      <div className="divide-y divide-slate-800 rounded-xl bg-slate-900">
        {bySlot.map((entry) => (
          <div key={entry.draftRound} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="mr-3 inline-block w-14 text-xs font-bold text-emerald-400">{entry.rosterPosition}</span>
              <span className="font-medium">{entry.player?.name ?? "Unknown"}</span>
              <span className="ml-2 text-xs text-slate-500">
                {entry.player?.position} · {entry.player?.realNflTeam}
              </span>
            </div>
            {!locked && entry.player && (
              <LockButton
                label="Lock In Pick"
                lockedLabel="Pick Locked In"
                resetAfterMs={1500}
                onConfirm={() => swap(entry.nflPlayerId, entry.player!.position)}
                className="px-3 py-1 text-xs"
              />
            )}
          </div>
        ))}
      </div>

      {showLockConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-100">Ready to lock in?</h2>
            <p className="mt-2 text-sm text-slate-400">
              Your roster is set for the entire season once you do. No trades or free agency after this point.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowLockConfirm(false)}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <LockButton label="Lock In Your Roster" onConfirm={confirmLockRoster} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
