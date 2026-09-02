import { useEffect, useRef, useState } from "react";
import { ROSTER_RULES } from "@lockedin/shared";
import { api, ApiError } from "../lib/api";
import { LockButton } from "../components/LockButton";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { PlayerCard } from "../components/ui/PlayerCard";
import { RosterIcon } from "../components/navIcons";
import { teamColor } from "../lib/nflTeamColors";
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
 * A bench player's promotion control: a small "Start" button that opens a
 * popover listing which eligible starter to swap places with - picking one
 * swaps immediately (freely reversible, so no separate confirm step). Only
 * offered when there's at least one starter slot this player's real
 * position can actually fill (e.g. a K can't swap into an RB slot) -
 * matches ROSTER_RULES exactly, the same rules the server enforces.
 *
 * Deliberately a compact button + floating popover rather than an inline
 * native <select> - a <select> sized to fit a full "Start over <name>
 * (<slot>)" option can't shrink to fit a narrow card, and the overflow
 * used to render right on top of the player's name/rating next to it.
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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const eligible = benchEntry.player
    ? starters.filter((s) => s.player && isValidForSlot(benchEntry.player!.position, s.rosterPosition))
    : [];

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (eligible.length === 0) return null;

  async function pick(starterId: string) {
    setBusy(true);
    try {
      await onSwap(benchEntry.nflPlayerId, starterId);
      setOpen(false);
    } catch {
      // onSwap already surfaces the error via the page's status banner - leave the popover open to retry.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="flex items-center gap-1 rounded-md border border-surface-border bg-surface-page px-2.5 py-1.5 text-[11px] font-semibold text-primary-400 transition-colors hover:border-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start"}
        <span aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-surface-border bg-surface-raised p-1 shadow-raised">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Swap into</p>
          {eligible.map((s) => (
            <button
              key={s.nflPlayerId}
              onClick={() => pick(s.nflPlayerId)}
              disabled={busy}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-200 transition-colors hover:bg-surface-page disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="truncate">{s.player!.name}</span>
              <span className="shrink-0 text-[10px] text-slate-500">{s.rosterPosition}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Browse and search the free-agent pool for one position before swapping
 * someone in - replaces silently auto-picking whoever has the single
 * highest rating with actually letting you see the options and choose,
 * the same way you'd shop free agents in any real fantasy app.
 */
function PlayerSearchModal({
  position,
  candidates,
  onPick,
  onClose,
}: {
  position: string;
  candidates: RatedPlayer[];
  onPick: (playerId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = candidates
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.rating?.overall ?? 0) - (a.rating?.overall ?? 0));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-5 shadow-raised"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Find a {position}</h2>
          <button onClick={onClose} className="text-slate-500 transition-colors hover:text-slate-300" aria-label="Close">
            ✕
          </button>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search available ${position}s by name…`}
          className="mb-3 w-full rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
        />
        <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              {query ? `No available ${position}s match "${query}".` : `No available ${position}s left.`}
            </p>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-surface-border bg-surface-page px-3 py-2 text-left transition-colors hover:border-primary-500/40"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white/90"
                style={{ backgroundColor: teamColor(p.realNflTeam) }}
              >
                {p.realNflTeam || "—"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{p.name}</span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-primary-300">{p.rating?.overall ?? "—"}</span>
            </button>
          ))}
        </div>
      </div>
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
  const [swapTarget, setSwapTarget] = useState<{ dropPlayerId: string; position: string } | null>(null);

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

  async function performSwap(dropPlayerId: string, addPlayerId: string) {
    if (!teamId) return;
    const replacement = allPlayers.find((p) => p.id === addPlayerId);
    try {
      await api.swapPlayer(teamId, dropPlayerId, addPlayerId);
      setStatus(replacement ? `Swapped in ${replacement.name}.` : "Swap complete.");
      setSwapTarget(null);
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
                <button
                  onClick={() => setSwapTarget({ dropPlayerId: entry.nflPlayerId, position: entry.player!.position })}
                  className="shrink-0 rounded-md border border-surface-border bg-surface-page px-2.5 py-1.5 text-[11px] font-semibold text-primary-400 transition-colors hover:border-primary-500/40"
                >
                  Change player
                </button>
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

      {swapTarget && (
        <PlayerSearchModal
          position={swapTarget.position}
          candidates={allPlayers.filter((p) => p.position === swapTarget.position && !rosteredIds.has(p.id))}
          onPick={(playerId) => {
            performSwap(swapTarget.dropPlayerId, playerId).catch(() => {});
          }}
          onClose={() => setSwapTarget(null)}
        />
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
