import { DoodleFigure } from "./playdiagram/DoodleFigure";

interface TeamIconBadgeProps {
  /** A TeamIconShape keyword, or null/undefined if the team hasn't picked one yet. */
  icon: string | null | undefined;
  size?: number;
  className?: string;
}

/** A small round badge for showing a team's chosen icon outside the field (scoreboard, dashboard cards) - reuses the same shape rendering as the on-field doodle figure so the identity stays consistent. */
export function TeamIconBadge({ icon, size = 22, className }: TeamIconBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-page ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {icon ? (
        <svg viewBox="-10 -10 20 20" width={size * 0.72} height={size * 0.72}>
          <DoodleFigure variant="offense" size={6} icon={icon} tick={false} />
        </svg>
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
      )}
    </span>
  );
}
