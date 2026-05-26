import { describe, test, expect } from "bun:test";
import { calculateFootballPlayerPoints } from "./footballScoring";
import type { FootballPlayer, FootballScoringSettings } from "@/types";

const halfPprSettings: FootballScoringSettings = {
  name: "Half-PPR",
  passing: {
    PassYds: 0.04,
    PassTD: 4,
    Int: -2,
  },
  rushing: {
    RushYds: 0.1,
    RushTD: 6,
  },
  receiving: {
    Rec: 0.5,
    RecYds: 0.1,
    RecTD: 6,
  },
  misc: {
    "2PT": 2,
    FumLost: -2,
  },
};

const basePlayer: FootballPlayer = {
  _type: "football-player",
  _id: "test-id",
  Name: "Test Player",
  Team: "TST",
  Position: "QB",
  PassYds: 0,
  PassTD: 0,
  Int: 0,
  RushYds: 0,
  RushTD: 0,
  Rec: 0,
  RecYds: 0,
  RecTD: 0,
  "2PT": 0,
  FumLost: 0,
  ADP: null,
};

describe("calculateFootballPlayerPoints", () => {
  test("QB with 4000 PassYds, 30 PassTD, 10 Int in Half-PPR", () => {
    const qb: FootballPlayer = {
      ...basePlayer,
      Name: "Test QB",
      Position: "QB",
      PassYds: 4000,
      PassTD: 30,
      Int: 10,
    };

    const points = calculateFootballPlayerPoints(qb, halfPprSettings);
    // 4000*0.04 + 30*4 + 10*(-2) = 160 + 120 - 20 = 260
    expect(points).toBe(260);
  });

  test("RB with 1000 RushYds, 10 RushTD, 50 Rec, 400 RecYds, 3 RecTD in Half-PPR", () => {
    const rb: FootballPlayer = {
      ...basePlayer,
      Name: "Test RB",
      Position: "RB",
      RushYds: 1000,
      RushTD: 10,
      Rec: 50,
      RecYds: 400,
      RecTD: 3,
    };

    const points = calculateFootballPlayerPoints(rb, halfPprSettings);
    // 1000*0.1 + 10*6 + 50*0.5 + 400*0.1 + 3*6 = 100 + 60 + 25 + 40 + 18 = 243
    expect(points).toBe(243);
  });

  test("undefined/null stats default to 0", () => {
    const partialPlayer = {
      ...basePlayer,
      PassYds: undefined,
      RushYds: undefined,
      Rec: undefined,
      "2PT": undefined,
      FumLost: null,
    } as unknown as FootballPlayer;

    const points = calculateFootballPlayerPoints(partialPlayer, halfPprSettings);
    expect(points).toBe(0);
  });

  test("decimal rounding works correctly", () => {
    const settings: FootballScoringSettings = {
      name: "Custom",
      passing: { PassYds: 0.0333, PassTD: 0, Int: 0 },
      rushing: { RushYds: 0, RushTD: 0 },
      receiving: { Rec: 0, RecYds: 0, RecTD: 0 },
      misc: { "2PT": 0, FumLost: 0 },
    };

    const player: FootballPlayer = {
      ...basePlayer,
      PassYds: 1,
    };

    const points = calculateFootballPlayerPoints(player, settings);
    // 1 * 0.0333 = 0.0333 -> rounded to 0.033... * 10 = 0.333 -> round = 0.3
    expect(points).toBe(0);
  });
});
