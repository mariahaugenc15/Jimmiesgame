import { useState } from "react";

const DISMISS_KEY = "lockedin_howto_dismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Onboarding for match controls: shown open the first time someone reaches
 * a match, collapses to a small re-openable "How to play" pill once
 * dismissed (remembered per-browser) so returning players aren't nagged.
 */
export function HowToPlay() {
  const [open, setOpen] = useState(() => !readDismissed());

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage can throw in private-browsing contexts - dismissal just won't stick, harmless.
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-primary-500/40 hover:text-primary-300"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500/20 text-[10px] font-bold text-primary-400">
          ?
        </span>
        How to play
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary-500/30 bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-bold text-white">How to play</h2>
        <button onClick={dismiss} className="shrink-0 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200">
          Got it
        </button>
      </div>
      <ul className="mt-2.5 space-y-2 text-sm text-slate-300">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-5 min-w-[2.75rem] shrink-0 items-center justify-center rounded bg-surface-page px-1 font-mono text-[11px] text-primary-400">
            1–6
          </span>
          On offense, press a number key or click a play to call it.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-5 min-w-[2.75rem] shrink-0 items-center justify-center rounded bg-surface-page px-1 font-mono text-[11px] text-primary-400">
            1–5
          </span>
          On defense, do the same to call your stop.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-5 min-w-[2.75rem] shrink-0 items-center justify-center rounded bg-surface-page px-1 text-center text-[11px] text-primary-400">
            ⚡
          </span>
          Both sides call at once — the play resolves the moment both are in.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-5 min-w-[2.75rem] shrink-0 items-center justify-center rounded bg-surface-page px-1 text-center text-[11px] text-primary-400">
            ▶
          </span>
          Watch the diagram after each snap — the route and ball-carrier show how it played out.
        </li>
      </ul>
    </div>
  );
}
