import { useState } from "react";
import { TEAM_ICON_SHAPES, type TeamIconShape } from "@lockedin/shared";
import { Card } from "./ui/Card";
import { LockButton } from "./LockButton";
import { DoodleFigure } from "./playdiagram/DoodleFigure";
import { buttonSecondary } from "../lib/ui";

interface IconPickerProps {
  teamName: string;
  /** The team's current icon, if they've picked one before - preselected so re-picking is a confirm, not a restart. */
  currentIcon: string | null;
  /** Saves the icon and starts the match. Throw/reject to signal failure - the confirm button reverts and shows an error. */
  onConfirm: (icon: string) => Promise<void>;
  onCancel: () => void;
}

function ShapeButton({ shape, selected, onClick }: { shape: TeamIconShape; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shape}
      className={`flex aspect-square items-center justify-center rounded-lg border-2 bg-surface-page transition-colors ${
        selected ? "border-primary-500 bg-primary-500/10" : "border-surface-border hover:border-primary-500/40"
      }`}
    >
      <svg viewBox="-10 -10 20 20" className="h-8 w-8">
        <DoodleFigure variant="offense" size={6} icon={shape} tick={false} />
      </svg>
    </button>
  );
}

/**
 * Shown right before a match starts (Play vs Bot / Find match) so the team
 * has a visual identity beyond its name - a shape drawn in the same
 * doodle-line style as the field, for a whimsical but consistent branding
 * touch rather than an open-ended emoji picker. Saved to the team via
 * setTeamIcon so it persists across matches until re-picked.
 */
export function IconPicker({ teamName, currentIcon, onConfirm, onCancel }: IconPickerProps) {
  const [selected, setSelected] = useState<TeamIconShape>(
    currentIcon && (TEAM_ICON_SHAPES as string[]).includes(currentIcon) ? (currentIcon as TeamIconShape) : TEAM_ICON_SHAPES[0],
  );
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm(selected);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
      <Card elevated className="w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-white">Choose {teamName}'s icon</h2>
        <p className="mt-1 text-sm text-slate-400">Pick how your team shows up on the scoreboard and the field.</p>

        <div className="mt-4 grid grid-cols-6 gap-2">
          {TEAM_ICON_SHAPES.map((shape) => (
            <ShapeButton key={shape} shape={shape} selected={selected === shape} onClick={() => setSelected(shape)} />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} disabled={confirming} className={`${buttonSecondary} flex-1`}>
            Cancel
          </button>
          <LockButton
            label="Confirm & Play"
            confirmingLabel="Starting…"
            onConfirm={handleConfirm}
            className="flex-1"
          />
        </div>
      </Card>
    </div>
  );
}
