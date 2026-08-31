import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Locked In",
        short_name: "Locked In",
        description: "Draft real NFL players, lock in your roster for the season, and play abstract head-to-head matchups.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        icons: [
          // The badge has content near its edges (the shield point, the "LOCKED IN"
          // banner), so it's declared "any" only — a maskable safe zone would clip it.
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
