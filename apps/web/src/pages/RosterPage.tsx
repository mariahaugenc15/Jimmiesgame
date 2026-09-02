import { useEffect, useState } from "react";
import { ROSTER_RULES } from "@lockedin/shared";
import { api, ApiError } from "../lib/api";
import { LockButton } from "../components/LockButton";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { PlayerCard } from "../components/ui/PlayerCard";
import { RosterIcon } from "../components/navIcons";
import { buttonSecondary } from "../lib/ui";

function isValidForSlot(position: string, slot: string): boolean {
  const rule = ROSTER_RULES.find((r) => r.slot === slot);
  return rule ? (rule.eligible as string[]).includes(position) : false;
}

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

/**
 * A bench player's promotion control: pick which eligible starter to swap
 * places with, then confirm. Only offered when there's at least one starter
 * slot this player's real position can actually fill (e.g. a K can't swap
 * into an RB slot) - matches ROSTER_RULES exactly, the same rules the
 * server enforces on the swap.
 */
function BenchSwapControl({
  benchEntry,
  starters,
  onSwap,
}: {
  benchEntry: RosterEntry;
  starters: RosterEntry[];
  onSwap: (benchPlayerId: string, starterPlayerId: string) => Promise<void>;
}) {
  const eligible = benchEntry.player
    ? starters.filter((s) => s.player && isValidForSlot(benchEntry.player!.position, s.rosterPosition))
    : [];
  const [target, setTarget] = useState(eligible[0]?.nflPlayerId ?? "");

  useEffect(() => {
    if (!eligible.some((s) => s.nflPlayerId === target)) setTarget(eligible[0]?.nflPlayerId ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible.map((s) => s.nflPlayerId).join(",")]);

  if (eligible.length === 0 || !target) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="rounded-md border border-surface-border bg-surface-page px-1.5 py-1.5 text-[11px] text-slate-200 outline-none"
      >
        {eligible.map((s) => (
          <option key={s.nflPlayerId} value={s.nflPlayerId}>
            Start over {s.player!.name} ({s.rosterPosition})
          </option>
        ))}
      </select>
      <LockButton
        label="Start"
        lockedLabel="Started"
        resetAfterMs={1500}
        onConfirm={() => onSwap(benchEntry.nflPlayerId, target)}
        className="shrink-0 px-2.5 py-1.5 text-[11px]"
      />
    </div>
  );
}

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

  /**
   * Swaps which of your own players occupies a starting slot vs the bench -
   * this is what actually decides who takes the field when you have more
   * than one player at a position, unlike /swap which trades for an
   * outside free agent. Allowed even after the season roster lock, since
   * it never changes who you own.
   */
  async function swapLineup(benchPlayerId: string, starterPlayerId: string) {
    if (!teamId) return;
    try {
      await api.setLineupSlot(teamId, benchPlayerId, starterPlayerId);
      setStatus("Lineup updated.");
      await load();
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Couldn't update lineup.");
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
    const isBench = entry.rosterPosition === "BENCH";
    return (
      <PlayerCard
        key={entry.draftRound}
        name={entry.player?.name ?? "Player data unavailable"}
        position={entry.player?.position ?? "—"}
        slot={entry.rosterPosition}
        team={entry.player?.realNflTeam ?? ""}
        overall={entry.player ? (ratingById.get(entry.nflPlayerId) ?? null) : null}
        action={
          entry.player ? (
            <div className="flex flex-col items-end gap-1.5">
              {isBench && (
                <BenchSwapControl benchEntry={entry} starters={starters} onSwap={swapLineup} />
              )}
              {!locked && (
                <LockButton
                  label="Lock In Pick"
                  lockedLabel="Locked"
                  resetAfterMs={1500}
                  onConfirm={() => swap(entry.nflPlayerId, entry.player!.position)}
                  className="shrink-0 px-2.5 py-1.5 text-[11px]"
                />
              )}
            </div>
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
            <p className="text-sm text-slate-500">
              Who you own locks for the season — who starts doesn't. Set your lineup any time.
            </p>
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
            <SectionHeader
              title="Starting lineup"
              subtitle="These are the players who actually take the field — the play-calling engine only ever features a starter."
            />
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
