import { describe, expect, it } from "bun:test";
import type { PitcherStats, ScoringSettings } from "@/types";
import { calculatePitcherPoints } from "./calculatePoints";

const basePitcher: PitcherStats = {
  Name: "Test Pitcher",
  Team: "TST",
  PlayerId: "1",
  MLBAMID: "1",
  W: 0,
  L: 0,
  QS: 0,
  CG: 0,
  ShO: 0,
  G: 0,
  GS: 0,
  SV: 0,
  HLD: 0,
  BS: 0,
  IP: 0,
  H: 0,
  R: 0,
  ER: 0,
  HR: 0,
  BB: 0,
  IBB: 0,
  HBP: 0,
  SO: 0,
  ERA: 0,
  WHIP: 0,
  "K/9": 0,
  "BB/9": 0,
  FIP: 0,
  WAR: 0,
  ADP: null,
};

const scoring: ScoringSettings["pitching"] = {
  IP: 3,
  W: 0,
  L: 0,
  QS: 0,
  CG: 0,
  ShO: 0,
  SV: 0,
  BS: 0,
  HLD: 0,
  SO: 0,
  H: 0,
  ER: 0,
  HR: 0,
  BB: 0,
  HBP: 0,
};

describe("calculatePitcherPoints IP handling", () => {
  it("uses baseball IP normalization when enabled", () => {
    const points101 = calculatePitcherPoints({ ...basePitcher, IP: 10.1 }, scoring, true);
    const points102 = calculatePitcherPoints({ ...basePitcher, IP: 10.2 }, scoring, true);

    expect(points101).toBe(31);
    expect(points102).toBe(32);
  });

  it("uses decimal IP when baseball normalization is disabled", () => {
    const points = calculatePitcherPoints({ ...basePitcher, IP: 10.1 }, scoring, false);
    expect(points).toBe(30.3);
  });
});
