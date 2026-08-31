import { useEffect, useState } from "react";
import { LockIcon } from "./LockIcon";

type LockButtonState = "idle" | "confirming" | "locked" | "error";

interface LockButtonProps {
  /** Idle label, e.g. "Lock In Your Roster" or "Lock In Pick". */
  label: string;
  confirmingLabel?: string;
  lockedLabel?: string;
  errorLabel?: string;
  /** Called on click. Throw (or reject) to signal failure — the button reverts to idle and shows errorLabel briefly. */
  onConfirm: () => Promise<void> | void;
  /** If set, the button reverts to idle this many ms after locking — for repeatable commitments
   *  like confirming one draft pick after another. Omit for a one-time, permanent lock (season roster). */
  resetAfterMs?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * The app's one commitment-action button: every "lock this in" moment
 * (roster lock, draft pick confirm, match/challenge accept) should render
 * through this component so the interaction is identical everywhere it
 * appears, not rebuilt per screen. The lock icon closes the instant the
 * user clicks — before onConfirm resolves — so the press itself feels
 * immediate even while a network request is in flight.
 */
export function LockButton({
  label,
  confirmingLabel = "Locking In…",
  lockedLabel = "Locked In",
  errorLabel = "Couldn't lock in — try again",
  onConfirm,
  resetAfterMs,
  disabled,
  className,
}: LockButtonProps) {
  const [state, setState] = useState<LockButtonState>("idle");

  useEffect(() => {
    if (state !== "locked" || !resetAfterMs) return;
    const timer = setTimeout(() => setState("idle"), resetAfterMs);
    return () => clearTimeout(timer);
  }, [state, resetAfterMs]);

  async function handleClick() {
    if (state === "confirming") return;
    setState("confirming");
    try {
      await onConfirm();
      setState("locked");
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 1200);
    }
  }

  const iconLocked = state === "confirming" || state === "locked";
  const isPermanentlyLocked = state === "locked" && !resetAfterMs;
  const text = state === "confirming" ? confirmingLabel : state === "locked" ? lockedLabel : state === "error" ? errorLabel : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === "confirming" || isPermanentlyLocked}
      aria-busy={state === "confirming"}
      data-state={state}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-90 ${
        state === "error"
          ? "bg-red-900 text-red-200"
          : state === "locked"
            ? "bg-emerald-800 text-emerald-100"
            : "bg-emerald-700 text-white hover:bg-emerald-600 disabled:hover:bg-emerald-700"
      } ${className ?? ""}`}
    >
      <LockIcon locked={iconLocked} size={18} />
      <span>{text}</span>
    </button>
  );
}
