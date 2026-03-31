import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import {
  calculateBatterPoints,
  calculatePitcherPoints,
  calculatePlayerPoints,
  normalizeIp,
  isValidBaseballIp,
} from "@/lib/scoring";
import type { NormalizedIp } from "@/lib/scoring";
import type {
  BatterStats,
  PitcherStats,
  ScoringSettings,
  TwoWayPlayer,
} from "@/types";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const zeroBattingWeights: ScoringSettings["batting"] = {
  R: 0, H: 0, "1B": 0, "2B": 0, "3B": 0, HR: 0,
  RBI: 0, SB: 0, CS: 0, BB: 0, IBB: 0, SO: 0,
  HBP: 0, SF: 0, GDP: 0,
};

const zeroPitchingWeights: ScoringSettings["pitching"] = {
  IP: 0, W: 0, L: 0, QS: 0, CG: 0, ShO: 0,
  SV: 0, BS: 0, HLD: 0, SO: 0, H: 0, ER: 0,
  HR: 0, BB: 0, HBP: 0,
};

const baseBatter: BatterStats = {
  Name: "Test Batter", Team: "TST", PlayerId: "b1", MLBAMID: "b1",
  G: 0, PA: 0, AB: 0, H: 0, "1B": 0, "2B": 0, "3B": 0, HR: 0,
  R: 0, RBI: 0, BB: 0, IBB: 0, SO: 0, HBP: 0, SF: 0, SH: 0, GDP: 0,
  SB: 0, CS: 0,
  AVG: 0, OBP: 0, SLG: 0, OPS: 0, ISO: 0, BABIP: 0, "wRC+": 0, WAR: 0,
  ADP: null,
};

const basePitcher: PitcherStats = {
  Name: "Test Pitcher", Team: "TST", PlayerId: "p1", MLBAMID: "p1",
  W: 0, L: 0, QS: 0, CG: 0, ShO: 0, G: 0, GS: 0, SV: 0, HLD: 0,
  BS: 0, IP: 0, H: 0, R: 0, ER: 0, HR: 0, BB: 0, IBB: 0, HBP: 0, SO: 0,
  ERA: 0, WHIP: 0, "K/9": 0, "BB/9": 0, FIP: 0, WAR: 0,
  ADP: null,
};

const defaultSettings: ScoringSettings = {
  name: "Test",
  batting: {
    R: 1, H: 0, "1B": 1, "2B": 2, "3B": 3, HR: 4,
    RBI: 1, SB: 2, CS: -1, BB: 1, IBB: 0, SO: -1,
    HBP: 1, SF: 0, GDP: -1,
  },
  pitching: {
    IP: 3, W: 5, L: -3, QS: 3, CG: 5, ShO: 5,
    SV: 5, BS: -3, HLD: 2, SO: 1, H: -1, ER: -2,
    HR: -2, BB: -1, HBP: -1,
  },
};

// Arbitrary for a subset of integer batter stats used in scoring
const arbBatterCountingStats = () =>
  fc.record({
    R: fc.integer({ min: 0, max: 200 }),
    "1B": fc.integer({ min: 0, max: 200 }),
    "2B": fc.integer({ min: 0, max: 60 }),
    "3B": fc.integer({ min: 0, max: 30 }),
    HR: fc.integer({ min: 0, max: 60 }),
    RBI: fc.integer({ min: 0, max: 200 }),
    SB: fc.integer({ min: 0, max: 80 }),
    CS: fc.integer({ min: 0, max: 30 }),
    BB: fc.integer({ min: 0, max: 120 }),
    IBB: fc.integer({ min: 0, max: 20 }),
    SO: fc.integer({ min: 0, max: 200 }),
    HBP: fc.integer({ min: 0, max: 30 }),
    SF: fc.integer({ min: 0, max: 15 }),
    GDP: fc.integer({ min: 0, max: 30 }),
    H: fc.integer({ min: 0, max: 250 }),
  });

const arbIntegerBattingWeights = () =>
  fc.record({
    R: fc.integer({ min: -5, max: 5 }),
    H: fc.constant(0),
    "1B": fc.integer({ min: -5, max: 5 }),
    "2B": fc.integer({ min: -5, max: 5 }),
    "3B": fc.integer({ min: -5, max: 5 }),
    HR: fc.integer({ min: -5, max: 5 }),
    RBI: fc.integer({ min: -5, max: 5 }),
    SB: fc.integer({ min: -5, max: 5 }),
    CS: fc.integer({ min: -5, max: 5 }),
    BB: fc.integer({ min: -5, max: 5 }),
    IBB: fc.integer({ min: -5, max: 5 }),
    SO: fc.integer({ min: -5, max: 5 }),
    HBP: fc.integer({ min: -5, max: 5 }),
    SF: fc.integer({ min: -5, max: 5 }),
    GDP: fc.integer({ min: -5, max: 5 }),
  });

const arbPitcherCountingStats = () =>
  fc.record({
    IP: fc.integer({ min: 0, max: 300 }),
    W: fc.integer({ min: 0, max: 25 }),
    L: fc.integer({ min: 0, max: 25 }),
    QS: fc.integer({ min: 0, max: 35 }),
    CG: fc.integer({ min: 0, max: 10 }),
    ShO: fc.integer({ min: 0, max: 5 }),
    SV: fc.integer({ min: 0, max: 50 }),
    BS: fc.integer({ min: 0, max: 15 }),
    HLD: fc.integer({ min: 0, max: 35 }),
    SO: fc.integer({ min: 0, max: 300 }),
    H: fc.integer({ min: 0, max: 300 }),
    ER: fc.integer({ min: 0, max: 150 }),
    HR: fc.integer({ min: 0, max: 50 }),
    BB: fc.integer({ min: 0, max: 120 }),
    HBP: fc.integer({ min: 0, max: 20 }),
  });

const arbIntegerPitchingWeights = () =>
  fc.record({
    IP: fc.integer({ min: -5, max: 5 }),
    W: fc.integer({ min: -5, max: 5 }),
    L: fc.integer({ min: -5, max: 5 }),
    QS: fc.integer({ min: -5, max: 5 }),
    CG: fc.integer({ min: -5, max: 5 }),
    ShO: fc.integer({ min: -5, max: 5 }),
    SV: fc.integer({ min: -5, max: 5 }),
    BS: fc.integer({ min: -5, max: 5 }),
    HLD: fc.integer({ min: -5, max: 5 }),
    SO: fc.integer({ min: -5, max: 5 }),
    H: fc.integer({ min: -5, max: 5 }),
    ER: fc.integer({ min: -5, max: 5 }),
    HR: fc.integer({ min: -5, max: 5 }),
    BB: fc.integer({ min: -5, max: 5 }),
    HBP: fc.integer({ min: -5, max: 5 }),
  });

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe("scoring property tests", () => {
  test("determinism: same batter inputs produce same output", () => {
    fc.assert(
      fc.property(arbBatterCountingStats(), arbIntegerBattingWeights(), (stats, weights) => {
        const batter = { ...baseBatter, ...stats };
        const a = calculateBatterPoints(batter, weights);
        const b = calculateBatterPoints(batter, weights);
        expect(a).toBe(b);
      }),
    );
  });

  test("determinism: same pitcher inputs produce same output", () => {
    fc.assert(
      fc.property(arbPitcherCountingStats(), arbIntegerPitchingWeights(), (stats, weights) => {
        const pitcher = { ...basePitcher, ...stats };
        const a = calculatePitcherPoints(pitcher, weights);
        const b = calculatePitcherPoints(pitcher, weights);
        expect(a).toBe(b);
      }),
    );
  });

  test("zero weights yield zero points for batters", () => {
    fc.assert(
      fc.property(arbBatterCountingStats(), (stats) => {
        const batter = { ...baseBatter, ...stats };
        expect(calculateBatterPoints(batter, zeroBattingWeights)).toBe(0);
      }),
    );
  });

  test("zero weights yield zero points for pitchers", () => {
    fc.assert(
      fc.property(arbPitcherCountingStats(), (stats) => {
        const pitcher = { ...basePitcher, ...stats };
        expect(calculatePitcherPoints(pitcher, zeroPitchingWeights)).toBe(0);
      }),
    );
  });

  test("linearity: doubling integer stats doubles points (integer weights, H=0)", () => {
    fc.assert(
      fc.property(arbBatterCountingStats(), arbIntegerBattingWeights(), (stats, weights) => {
        const single = { ...baseBatter, ...stats };
        const doubled: Record<string, unknown> = { ...baseBatter };
        for (const key of Object.keys(stats) as (keyof typeof stats)[]) {
          doubled[key] = stats[key] * 2;
        }
        const singlePts = calculateBatterPoints(single, weights);
        const doublePts = calculateBatterPoints(doubled as unknown as BatterStats, weights);
        // Because rounding is round(x*10)/10, and all values are integers,
        // singlePts and doublePts should be exact tenths. 2*singlePts == doublePts.
        expect(doublePts).toBe(singlePts * 2);
      }),
    );
  });

  test("linearity: doubling integer stats doubles points for pitchers (integer weights, no baseball IP)", () => {
    fc.assert(
      fc.property(arbPitcherCountingStats(), arbIntegerPitchingWeights(), (stats, weights) => {
        const single = { ...basePitcher, ...stats };
        const doubled: Record<string, unknown> = { ...basePitcher };
        for (const key of Object.keys(stats) as (keyof typeof stats)[]) {
          doubled[key] = stats[key] * 2;
        }
        const singlePts = calculatePitcherPoints(single, weights, false);
        const doublePts = calculatePitcherPoints(doubled as unknown as PitcherStats, weights, false);
        expect(doublePts).toBe(singlePts * 2);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe("two-way player scoring", () => {
  test("combined points equal batting + pitching within rounding", () => {
    const twoWay: TwoWayPlayer = {
      _type: "two-way",
      _id: "tw1",
      Name: "Ohtani",
      Team: "LAD",
      PlayerId: "tw1",
      MLBAMID: "tw1",
      ADP: null,
      _battingStats: {
        G: 150, PA: 600, AB: 500, H: 150, "1B": 90, "2B": 30, "3B": 5, HR: 25,
        R: 90, RBI: 80, BB: 60, IBB: 5, SO: 120, HBP: 5, SF: 3, SH: 0, GDP: 10,
        SB: 20, CS: 5,
        AVG: 0.300, OBP: 0.380, SLG: 0.550, OPS: 0.930, ISO: 0.250,
        BABIP: 0.320, "wRC+": 150, WAR: 5.0,
      },
      _pitchingStats: {
        W: 12, L: 5, QS: 18, CG: 1, ShO: 0, G: 25, GS: 25, SV: 0, HLD: 0,
        BS: 0, IP: 150, H: 120, R: 55, ER: 50, HR: 15, BB: 40, IBB: 2,
        HBP: 5, SO: 180,
        ERA: 3.00, WHIP: 1.07, "K/9": 10.8, "BB/9": 2.4, FIP: 3.10, WAR: 4.0,
      },
    };

    const combined = calculatePlayerPoints(twoWay, defaultSettings, "all", false);
    const battingOnly = calculatePlayerPoints(twoWay, defaultSettings, "batters", false);
    const pitchingOnly = calculatePlayerPoints(twoWay, defaultSettings, "pitchers", false);

    // The combined should equal batting + pitching within rounding tolerance
    expect(Math.abs(combined - (battingOnly + pitchingOnly))).toBeLessThanOrEqual(0.1);
  });
});

describe("IP normalization", () => {
  test("180.2 is valid with 542 outs", () => {
    const result = normalizeIp(180.2);
    expect(result.valid).toBe(true);
    expect(result.outs).toBe(542);
    // 542 / 3 = 180.666...
    expect(result.innings).toBeCloseTo(542 / 3, 5);
  });

  test("invalid fractional parts are rejected", () => {
    expect(isValidBaseballIp(10.3)).toBe(false);
    expect(isValidBaseballIp(10.4)).toBe(false);
    expect(isValidBaseballIp(10.5)).toBe(false);
    expect(isValidBaseballIp(10.19)).toBe(false);
    expect(isValidBaseballIp(10.25)).toBe(false);
    expect(isValidBaseballIp(-1)).toBe(false);
    expect(isValidBaseballIp(Infinity)).toBe(false);
    expect(isValidBaseballIp(NaN)).toBe(false);
  });

  test("NormalizedIp type is usable", () => {
    const result: NormalizedIp = normalizeIp(6.1);
    expect(result.valid).toBe(true);
    expect(result.outs).toBe(19);
  });
});
