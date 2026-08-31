/**
 * Shared button-class constants so hierarchy (primary/secondary/tertiary)
 * is consistent everywhere a button appears, instead of every page picking
 * its own shade of "greenish button." Applied via className on a plain
 * <button>, not a wrapper component - keeps existing markup/behavior intact
 * while unifying the visual language.
 */
export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-all hover:bg-primary-500 hover:shadow-glow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary-600 disabled:hover:shadow-card";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:border-primary-500/40 hover:bg-surface-card active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const buttonTertiary =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-surface-raised hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

/** Position -> pill color, shared by roster rows and the dashboard's roster summary strip. */
export const POSITION_STYLES: Record<string, string> = {
  QB: "bg-data-500/15 text-data-300 border-data-500/40",
  RB: "bg-primary-500/15 text-primary-300 border-primary-500/40",
  WR: "bg-violet-500/15 text-violet-300 border-violet-400/40",
  TE: "bg-locked-500/15 text-locked-300 border-locked-500/40",
  DEF: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  K: "bg-danger-500/15 text-danger-300 border-danger-500/40",
  FLEX: "bg-slate-600/15 text-slate-300 border-slate-600/40",
  BENCH: "bg-slate-700/20 text-slate-500 border-slate-700/40",
};
