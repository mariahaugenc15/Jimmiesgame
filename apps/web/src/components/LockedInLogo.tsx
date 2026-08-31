import { useEffect, useState } from "react";
import { LockIcon } from "./LockIcon";

interface LockedInLogoProps {
  /** "once": open on mount, snaps shut after a short beat and stays closed (splash/first-load use).
   *  "loop": cycles open/closed continuously (use as a loading indicator).
   *  "static": renders already-closed with no animation (e.g. inside a nav bar). */
  mode?: "once" | "loop" | "static";
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export function LockedInLogo({ mode = "once", size = 40, showWordmark = true, className }: LockedInLogoProps) {
  const [locked, setLocked] = useState(mode === "static");

  useEffect(() => {
    if (mode === "once") {
      setLocked(false);
      const t = setTimeout(() => setLocked(true), 200);
      return () => clearTimeout(t);
    }
    if (mode === "loop") {
      setLocked(false);
      const interval = setInterval(() => setLocked((prev) => !prev), 900);
      return () => clearInterval(interval);
    }
    setLocked(true);
    return undefined;
  }, [mode]);

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <LockIcon locked={locked} size={size} />
      {showWordmark && (
        <span className="text-xl font-extrabold tracking-tight text-slate-100">
          Locked <span className="text-emerald-400">In</span>
        </span>
      )}
    </div>
  );
}
