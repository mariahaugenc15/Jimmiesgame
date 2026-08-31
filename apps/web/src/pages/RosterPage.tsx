import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";

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
      return;
    }
    try {
      await api.swapPlayer(teamId, dropPlayerId, replacement.id);
      setStatus(`Swapped in ${replacement.name}.`);
      await load();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Swap failed.");
    }
  }

  async function lockRoster() {
    if (!teamId) return;
    try {
      await api.lockTeam(teamId);
      setLocked(true);
      setStatus("Roster locked for the season.");
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Lock failed.");
    }
  }

  const bySlot = SLOT_ORDER.flatMap((slot) => roster.filter((r) => r.rosterPosition === slot));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-emerald-400">My Roster</h1>
        {!locked && teamId && roster.length > 0 && (
          <button onClick={lockRoster} className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-semibold hover:bg-amber-600">
            Lock roster
          </button>
        )}
        {locked && <span className="text-sm text-amber-400">Locked for season</span>}
      </div>
      {status && <p className="rounded-md bg-slate-900 p-3 text-sm text-slate-300">{status}</p>}

      {roster.length === 0 && <p className="text-slate-400">No roster yet — run a solo draft from the Dashboard first.</p>}

      <div className="divide-y divide-slate-800 rounded-xl bg-slate-900">
        {bySlot.map((entry) => (
          <div key={entry.nflPlayerId} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="mr-3 inline-block w-14 text-xs font-bold text-emerald-400">{entry.rosterPosition}</span>
              <span className="font-medium">{entry.player?.name ?? "Unknown"}</span>
              <span className="ml-2 text-xs text-slate-500">
                {entry.player?.position} · {entry.player?.realNflTeam}
              </span>
            </div>
            {!locked && entry.player && (
              <button
                onClick={() => swap(entry.nflPlayerId, entry.player!.position)}
                className="rounded-md bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
              >
                Swap
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
