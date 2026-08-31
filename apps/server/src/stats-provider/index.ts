import { env } from "../env.js";
import { MockStatsProvider } from "./mockProvider.js";
import { SleeperStatsProvider } from "./sleeperProvider.js";
import type { StatsProvider } from "./types.js";

export type { StatsProvider } from "./types.js";

/**
 * Swappable provider resolution. Add real providers (SportsDataIO, nflverse,
 * ...) here behind the same StatsProvider interface without touching
 * rating-engine or gameplay code.
 */
function createStatsProvider(): StatsProvider {
  switch (env.statsProvider) {
    case "sleeper":
      return new SleeperStatsProvider();
    case "mock":
    default:
      return new MockStatsProvider();
  }
}

export const statsProvider = createStatsProvider();
