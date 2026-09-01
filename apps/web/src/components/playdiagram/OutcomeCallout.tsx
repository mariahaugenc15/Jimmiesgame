import type { PlayResult } from "@lockedin/shared";
import "./playdiagram.css";

interface CalloutContent {
  text: string;
  sub?: string;
  className: string;
}

function calloutContent(result: PlayResult): CalloutContent {
  switch (result.type) {
    case "touchdown":
      return { text: "TOUCHDOWN!", className: "text-primary-300" };
    case "gain":
      return result.yards >= 0
        ? { text: `GAIN OF ${result.yards}`, className: "text-primary-300" }
        : { text: "STUFFED", sub: `${result.yards} yds`, className: "text-locked-300" };
    case "incomplete":
      return { text: "INCOMPLETE", className: "text-locked-300" };
    case "sack":
      return { text: "SACKED", sub: `${result.yards} yds`, className: "text-danger-300" };
    case "interception":
      return { text: "INTERCEPTED", className: "text-danger-300" };
    case "fumble":
      return { text: "FUMBLE!", className: "text-danger-300" };
    case "turnover_on_downs":
      return { text: "TURNOVER ON DOWNS", className: "text-locked-300" };
  }
}

/**
 * The emotional peak of a snap: a large banner that pops in over the field
 * once the route/ball-carrier motion has played out, holds, then fades -
 * sized and timed for that moment, not treated as a caption. See
 * playdiagram.css's .outcome-callout for the pop/hold/fade timing.
 */
export function OutcomeCallout({ result }: { result: PlayResult }) {
  const { text, sub, className } = calloutContent(result);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className={`outcome-callout rounded-2xl bg-surface-page/90 px-6 py-4 text-center shadow-raised backdrop-blur-sm`}>
        <p className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${className}`}>{text}</p>
        {sub && <p className="mt-1 text-sm font-semibold text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
