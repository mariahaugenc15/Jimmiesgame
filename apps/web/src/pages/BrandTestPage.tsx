import { useState, type ReactNode } from "react";
import { LockedInLogo } from "../components/LockedInLogo";
import { LockButton } from "../components/LockButton";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-slate-900 p-6">
      <h2 className="text-lg font-bold text-slate-100">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function BrandTestPage() {
  const [replayCount, setReplayCount] = useState(0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-20">
      <div>
        <h1 className="text-xl font-bold text-emerald-400">Brand &amp; interaction test page</h1>
        <p className="mt-1 text-sm text-slate-400">
          Isolated preview of the logo and the shared LockButton component before they're wired into the real
          roster-lock, draft-pick, and match-start flows. Not linked from the app nav.
        </p>
      </div>

      <Section title="Logo — once (splash / first load)" description="Plays open → snap shut on mount, then stays locked.">
        <div className="flex items-center gap-6">
          <LockedInLogo key={replayCount} mode="once" size={48} />
          <button
            onClick={() => setReplayCount((c) => c + 1)}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
          >
            Replay
          </button>
        </div>
      </Section>

      <Section title="Logo — loop (loading indicator)" description="Cycles open/closed continuously; drop-in replacement for a spinner.">
        <LockedInLogo mode="loop" size={48} showWordmark={false} />
      </Section>

      <Section title="Logo — static (nav bar size)">
        <LockedInLogo mode="static" size={28} />
      </Section>

      <Section
        title="LockButton — one-time permanent lock"
        description={'Simulates "Lock In Your Roster": ~900ms fake network delay, then stays locked forever.'}
      >
        <LockButton label="Lock In Your Roster" onConfirm={() => sleep(900)} />
        <p className="mt-3 max-w-md text-xs text-slate-500">
          Sample confirmation copy: "Ready to lock in? Your roster is set for the entire season once you do."
        </p>
      </Section>

      <Section
        title="LockButton — repeatable lock"
        description={'Simulates "Lock In Pick" during a draft: resets to idle 1.5s after each confirm so it can fire again.'}
      >
        <LockButton label="Lock In Pick" lockedLabel="Pick Locked In" resetAfterMs={1500} onConfirm={() => sleep(500)} />
      </Section>

      <Section
        title="LockButton — pre-match state label"
        description='Static label variant for "waiting to start" rather than an action button.'
      >
        <div className="inline-flex items-center gap-2 rounded-md bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-300">
          Locked In and Ready
        </div>
      </Section>

      <Section title="LockButton — failure / retry" description="Always rejects, to preview the error state and auto-recovery.">
        <LockButton
          label="Lock In Lineup"
          onConfirm={async () => {
            await sleep(600);
            throw new Error("simulated failure");
          }}
        />
      </Section>

      <Section title="Landing hero tagline candidates">
        <ul className="space-y-1 text-sm text-slate-300">
          <li>"Draft It. Lock It In. Own It All Season."</li>
          <li>"One Draft. One Roster. Locked In."</li>
        </ul>
      </Section>
    </div>
  );
}
