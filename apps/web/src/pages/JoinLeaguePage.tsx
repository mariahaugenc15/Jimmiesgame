import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { LockedInLogo } from "../components/LockedInLogo";

/**
 * The landing spot for a shared invite link (/join-league/:leagueId) - joins
 * the visitor's team to the league and drops them on the Leagues page,
 * instead of asking them to copy-paste a raw league ID into a text field by
 * hand. RequireAuth (see App.tsx) already sends a logged-out visitor to
 * /login first; there's nothing to preserve the invite through that
 * redirect yet, so for now this only works for someone already logged in.
 */
export function JoinLeaguePage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;

    api
      .myTeams()
      .then(async (teams) => {
        const mine = teams.find((t) => !t.name.startsWith("Bot Squad"));
        if (!mine) {
          if (!cancelled) setError("Create your team first, then use this invite link again.");
          return;
        }
        await api.joinLeague(leagueId, mine.id);
        if (!cancelled) navigate("/leagues", { replace: true });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't join that league.");
      });

    return () => {
      cancelled = true;
    };
  }, [leagueId, navigate]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      {error ? (
        <>
          <h1 className="text-xl font-bold text-white">Couldn't join</h1>
          <p className="max-w-sm text-sm text-slate-400">{error}</p>
        </>
      ) : (
        <>
          <LockedInLogo mode="loop" size={44} showWordmark={false} />
          <p className="text-slate-400">Joining league…</p>
        </>
      )}
    </div>
  );
}
