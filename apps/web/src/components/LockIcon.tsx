import "./lock-icon.css";

interface LockIconProps {
  /** Target state. Transitions animate via CSS (see lock-icon.css) — no JS-driven keyframing needed. */
  locked: boolean;
  size?: number;
  className?: string;
}

/**
 * Abstract padlock mark, built as SVG + CSS rather than a static image so it
 * can double as a loading indicator (see LockedInLogo). The shackle pivots
 * open/closed around its own hinge point with a "back" easing curve, which
 * overshoots past the resting position before settling — that's what reads
 * as a satisfying snap rather than a linear close.
 */
export function LockIcon({ locked, size = 28, className }: LockIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <path
        d="M 10 17 L 10 10 A 6 6 0 0 1 22 10 L 22 17"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        className="lock-shackle"
        data-locked={locked}
      />
      <rect x={6} y={15} width={20} height={13} rx={3} className="lock-body" data-locked={locked} />
      <circle cx={16} cy={20} r={1.6} className="lock-keyhole" />
      <rect x={15} y={21} width={2} height={4} className="lock-keyhole" />
    </svg>
  );
}
