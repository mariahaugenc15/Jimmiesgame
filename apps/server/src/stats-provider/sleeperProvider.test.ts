import { describe, expect, it } from "vitest";
import { mapSleeperPlayer, mapSleeperStats } from "./sleeperProvider.js";

describe("mapSleeperPlayer", () => {
  it("maps a skill-position player", () => {
    const player = mapSleeperPlayer({
      player_id: "4046",
      first_name: "Patrick",
      last_name: "Mahomes",
      full_name: "Patrick Mahomes",
      position: "QB",
      team: "KC",
      number: 15,
    });
    expect(player).toEqual({
      id: "4046",
      externalId: "4046",
      name: "Patrick Mahomes",
      position: "QB",
      realNflTeam: "KC",
      jerseyNumber: 15,
    });
  });

  it("falls back to first+last name when full_name is missing", () => {
    const player = mapSleeperPlayer({ player_id: "1", first_name: "Joe", last_name: "Burrow", position: "QB", team: "CIN" });
    expect(player?.name).toBe("Joe Burrow");
  });

  it("maps a team defense entry keyed by team abbreviation", () => {
    const player = mapSleeperPlayer({
      player_id: "SF",
      first_name: "San Francisco",
      last_name: "49ers",
      position: "DEF",
      team: "SF",
    });
    expect(player).toEqual({
      id: "SF",
      externalId: "SF",
      name: "San Francisco 49ers",
      position: "DEF",
      realNflTeam: "SF",
      jerseyNumber: undefined,
    });
  });

  it("filters out non-fantasy positions (OL, LB, DB, etc.)", () => {
    expect(mapSleeperPlayer({ player_id: "9", position: "OL", team: "KC" })).toBeNull();
    expect(mapSleeperPlayer({ player_id: "10", position: "LB", team: "KC" })).toBeNull();
    expect(mapSleeperPlayer({ player_id: "11", team: "KC" })).toBeNull();
  });
});

describe("mapSleeperStats", () => {
  it("maps QB passing/rushing fields", () => {
    const line = mapSleeperStats("4046", 2025, 3, {
      pass_att: 34,
      pass_cmp: 25,
      pass_yd: 291,
      pass_td: 2,
      pass_int: 1,
      rush_att: 3,
      rush_yd: 12,
      rush_td: 0,
    });
    expect(line).toMatchObject({
      playerId: "4046",
      season: 2025,
      week: 3,
      passAttempts: 34,
      passCompletions: 25,
      passYards: 291,
      passTDs: 2,
      interceptions: 1,
      rushAttempts: 3,
      rushYards: 12,
      rushTDs: 0,
    });
  });

  it("combines solo and assisted tackles for the defense tackle count", () => {
    const line = mapSleeperStats("SF", 2025, 3, { tackle_solo: 30, tackle_ast: 8, sack: 3 });
    expect(line.tackles).toBe(38);
    expect(line.sacks).toBe(3);
  });

  it("leaves fields undefined rather than defaulting to zero when absent", () => {
    const line = mapSleeperStats("1", 2025, 3, { rec: 6 });
    expect(line.receptions).toBe(6);
    expect(line.passAttempts).toBeUndefined();
    expect(line.tackles).toBeUndefined();
  });
});
