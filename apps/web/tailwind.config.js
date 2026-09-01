/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0b3d24",
        pitchLine: "#e2e8f0",
        // Design tokens. Semantic names (not raw hex) so every page pulls
        // from the same small palette instead of picking its own shade of
        // "greenish" or "grayish" - see DESIGN.md-equivalent notes below.
        //
        // Surfaces: three navy steps for depth (page < card < elevated/hover),
        // instead of one flat slate-900 everywhere.
        surface: {
          // Deep pitch-green rather than flat black - the app-wide route
          // backdrop lives on this, so it needs to read as "field at
          // night," not an empty void with faint lines on it.
          page: "#071a11",
          card: "#0d1424",
          raised: "#141d33",
          border: "#232e47",
        },
        // Primary accent: the one color for the app's main commitment
        // actions (lock in, primary CTA, active nav). Kept in the green
        // family but pushed brighter/more saturated than the old muted
        // emerald-700 so it reads as "electric," not just "dark green."
        primary: {
          50: "#e6fff5",
          300: "#4CF0AC",
          400: "#22E29A",
          500: "#10D688",
          600: "#0BB873",
          700: "#08935B",
          900: "#054A2E",
        },
        // Secondary "data" accent: stat bars, ratings, probability/momentum,
        // anything that's showing you a number rather than asking for a click.
        data: {
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
        },
        // "Locked" / urgent accent: roster-lock countdowns, draft-clock
        // urgency, anything time-sensitive. Distinct from primary so
        // "you can act" (green) and "you must act soon" (amber) never
        // collide.
        locked: {
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
        // Loss / alert accent: defeats, errors, destructive actions.
        danger: {
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
        },
      },
      boxShadow: {
        // Elevation scale: two steps beyond Tailwind's defaults, tuned for
        // a dark background (a plain black shadow disappears on navy, so
        // these lean on a soft light inset edge instead of pure drop shadow).
        card: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        raised: "0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.07)",
        glow: "0 0 0 1px rgba(16,214,136,0.4), 0 0 24px rgba(16,214,136,0.25)",
      },
    },
  },
  plugins: [],
};
