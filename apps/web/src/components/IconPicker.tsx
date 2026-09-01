import { useState } from "react";
import { TEAM_ICON_EMOJI, TEAM_ICON_SHAPES, type TeamIconShape } from "@lockedin/shared";
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

function EmojiButton({ emoji, selected, onClick }: { emoji: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={emoji}
      className={`flex aspect-square items-center justify-center rounded-lg border-2 text-xl transition-colors ${
        selected ? "border-primary-500 bg-primary-500/10" : "border-surface-border bg-surface-page hover:border-primary-500/40"
      }`}
    >
      {emoji}
    </button>
  );
}

/**
 * Shown right before a match starts (Play vs Bot / Find match) so the team
 * has a visual identity beyond its name - a shape drawn in the same
 * doodle-line style as the field, or an emoji for more personality. Saved to
 * the team via setTeamIcon so it persists across matches until re-picked.
 */
export function IconPicker({ teamName, currentIcon, onConfirm, onCancel }: IconPickerProps) {
  const [tab, setTab] = useState<"shapes" | "emoji">(
    currentIcon && TEAM_ICON_EMOJI.includes(currentIcon) ? "emoji" : "shapes",
  );
  const [selected, setSelected] = useState<string>(currentIcon ?? TEAM_ICON_SHAPES[0]);
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

        <div className="mt-4 flex gap-1 rounded-lg bg-surface-page p-1">
          {(["shapes", "emoji"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition-colors ${
                tab === t ? "bg-surface-raised text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "shapes" ? (
          <div className="mt-3 grid grid-cols-6 gap-2">
            {TEAM_ICON_SHAPES.map((shape) => (
              <ShapeButton key={shape} shape={shape} selected={selected === shape} onClick={() => setSelected(shape)} />
            ))}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-6 gap-2">
            {TEAM_ICON_EMOJI.map((emoji) => (
              <EmojiButton key={emoji} emoji={emoji} selected={selected === emoji} onClick={() => setSelected(emoji)} />
            ))}
          </div>
        )}

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
