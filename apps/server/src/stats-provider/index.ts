import { env } from "../env.js";
import { MockStatsProvider } from "./mockProvider.js";
import type { StatsProvider } from "./types.js";

export type { StatsProvider } from "./types.js";

/**
 * Swappable provider resolution. Add real providers (SportsDataIO, Sleeper,
 * nflverse) here behind the same StatsProvider interface without touching
 * rating-engine or gameplay code.
 */
function createStatsProvider(): StatsProvider {
  switch (env.statsProvider) {
    case "mock":
    default:
      return new MockStatsProvider();
  }
}

export const statsProvider = createStatsProvider();
