import { describe, expect, it } from "bun:test";
import type { PitcherPlayer } from "@/types";
import { applyPitchingOutcomeEstimates } from "./pitchingOutcomeImport";

const buildPitcher = (overrides: Partial<PitcherPlayer>): PitcherPlayer => ({
  _type: "pitcher",
  _id: "p-1",
  Name: "Pitcher One",
  Team: "AAA",
  PlayerId: "1",
  MLBAMID: "1",
  W: 12,
  L: 8,
  QS: 0,
  CG: 0,
  ShO: 0,
  G: 32,
  GS: 32,
  SV: 0,
  HLD: 0,
  BS: 0,
  IP: 215,
  H: 180,
  R: 72,
  ER: 68,
  HR: 20,
  BB: 55,
  IBB: 0,
  HBP: 4,
  SO: 210,
  ERA: 2.85,
  WHIP: 1.09,
  "K/9": 8.8,
  "BB/9": 2.3,
  FIP: 2.95,
  WAR: 4.2,
  ADP: null,
  ...overrides,
});

describe("applyPitchingOutcomeEstimates", () => {
  it("estimates only selected missing outcomes", () => {
    const pitchers = [
      buildPitcher({ _id: "p-1", QS: 0, CG: 0, ShO: 0 }),
      buildPitcher({ _id: "p-2", QS: 18, CG: 2, ShO: 1 }),
    ];

    const summary = {
      QS: { totalPlayers: 2, missingPlayerIds: ["p-1"] },
      CG: { totalPlayers: 2, missingPlayerIds: ["p-1"] },
      ShO: { totalPlayers: 2, missingPlayerIds: ["p-1"] },
    };

    const updated = applyPitchingOutcomeEstimates(
      pitchers,
      summary,
      { QS: true, CG: false, ShO: true },
      false
    );

    expect(updated[0].QS).toBeGreaterThan(0);
    expect(updated[0].CG).toBe(0);
    expect(updated[0].ShO).toBeGreaterThanOrEqual(0);
    expect(updated[1].QS).toBe(18);
    expect(updated[1].CG).toBe(2);
    expect(updated[1].ShO).toBe(1);
  });

  it("returns the original array when no stats are selected", () => {
    const pitchers = [buildPitcher({ _id: "p-1" })];
    const summary = {
      QS: { totalPlayers: 1, missingPlayerIds: ["p-1"] },
      CG: { totalPlayers: 1, missingPlayerIds: ["p-1"] },
      ShO: { totalPlayers: 1, missingPlayerIds: ["p-1"] },
    };

    const updated = applyPitchingOutcomeEstimates(
      pitchers,
      summary,
      { QS: false, CG: false, ShO: false },
      false
    );

    expect(updated).toBe(pitchers);
  });
});
