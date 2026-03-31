import { describe, expect, test, it } from "bun:test";
import fc from "fast-check";
import {
  computeHitterEligibility,
  computePitcherEligibility,
  emptyPositionGames,
  mergeTwoWayEligibility,
  POSITION_ORDER,
  formatEligibilityForLeaderboard,
} from "@/lib/eligibility";
import type { BatterPlayer, PitcherPlayer, Position } from "@/types";

const VALID_HITTER_POSITIONS: Position[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

// ---------------------------------------------------------------------------
// Original tests (migrated from eligibility.test.ts)
// ---------------------------------------------------------------------------
describe("eligibility", () => {
  it("marks hitter eligible at 20+ games", () => {
    const games = emptyPositionGames();
    games["3B"] = 20;
    const eligibility = computeHitterEligibility(games, 2025);
    expect(eligibility.eligiblePositions).toContain("3B");
  });

  it("marks hitter eligible at 25% threshold", () => {
    const games = emptyPositionGames();
    games.C = 5;
    const eligibility = computeHitterEligibility(games, 2025);
    expect(eligibility.eligiblePositions).toContain("C");
  });

  it("marks SP/RP eligibility correctly", () => {
    const eligibility = computePitcherEligibility({ G: 13, GS: 5 }, 2025);
    expect(eligibility.isSP).toBe(true);
    expect(eligibility.isRP).toBe(true);
  });

  it("uses 25% ratio thresholds for SP/RP", () => {
    const spEligibility = computePitcherEligibility({ G: 4, GS: 1 }, 2025);
    expect(spEligibility.isSP).toBe(true);

    const rpEligibility = computePitcherEligibility({ G: 4, GS: 3 }, 2025);
    expect(rpEligibility.isRP).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------
describe("eligibility property tests", () => {
  const positionGamesArb = fc.record(
    Object.fromEntries(
      VALID_HITTER_POSITIONS.map((pos) => [pos, fc.nat({ max: 162 })])
    ) as Record<Position, fc.Arbitrary<number>>
  );

  test("eligible positions are always a subset of valid positions", () => {
    fc.assert(
      fc.property(positionGamesArb, fc.nat({ max: 2030 }), (games, season) => {
        const result = computeHitterEligibility(games as Record<Position, number>, season);
        for (const pos of result.eligiblePositions) {
          expect(VALID_HITTER_POSITIONS).toContain(pos);
        }
      })
    );
  });

  test("eligibility computation is deterministic", () => {
    fc.assert(
      fc.property(positionGamesArb, fc.nat({ max: 2030 }), (games, season) => {
        const g = games as Record<Position, number>;
        const a = computeHitterEligibility(g, season);
        const b = computeHitterEligibility(g, season);
        expect(a.eligiblePositions).toEqual(b.eligiblePositions);
        expect(a.isSP).toBe(b.isSP);
        expect(a.isRP).toBe(b.isRP);
      })
    );
  });

  test("pitcher with G >= 8 gets either SP or RP", () => {
    fc.assert(
      fc.property(
        fc.record({
          G: fc.integer({ min: 8, max: 80 }),
          GS: fc.integer({ min: 0, max: 80 }),
        }).filter(({ G, GS }) => GS <= G),
        fc.nat({ max: 2030 }),
        (pitching, season) => {
          const result = computePitcherEligibility(pitching, season);
          expect(result.isSP || result.isRP).toBe(true);
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// formatEligibilityForLeaderboard tests
// ---------------------------------------------------------------------------
describe("formatEligibilityForLeaderboard", () => {
  function makeBatter(overrides: Partial<BatterPlayer> = {}): BatterPlayer {
    return {
      _type: "batter",
      _id: "test-batter",
      Name: "Test Player",
      Team: "TST",
      PlayerId: "12345",
      MLBAMID: "12345",
      G: 150,
      PA: 600,
      AB: 550,
      H: 150,
      "1B": 100,
      "2B": 30,
      "3B": 5,
      HR: 15,
      R: 80,
      RBI: 70,
      BB: 50,
      IBB: 3,
      SO: 100,
      HBP: 5,
      SF: 4,
      SH: 1,
      GDP: 8,
      SB: 10,
      CS: 3,
      AVG: 0.280,
      OBP: 0.350,
      SLG: 0.420,
      OPS: 0.770,
      ISO: 0.140,
      BABIP: 0.310,
      "wRC+": 115,
      WAR: 3.5,
      ADP: 100,
      ...overrides,
    };
  }

  test("returns dash when no eligibility", () => {
    const player = makeBatter({ eligibility: undefined });
    expect(formatEligibilityForLeaderboard(player)).toBe("-");
  });

  test("returns dash when eligibility has no positions and no SP/RP", () => {
    const player = makeBatter({
      eligibility: {
        positionGames: emptyPositionGames(),
        eligiblePositions: [],
        isSP: false,
        isRP: false,
        sourceSeason: 2025,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(formatEligibilityForLeaderboard(player)).toBe("-");
  });

  test("formats single position", () => {
    const player = makeBatter({
      eligibility: {
        positionGames: emptyPositionGames(),
        eligiblePositions: ["SS"],
        isSP: false,
        isRP: false,
        sourceSeason: 2025,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(formatEligibilityForLeaderboard(player)).toBe("SS");
  });

  test("formats multiple positions in POSITION_ORDER", () => {
    const player = makeBatter({
      eligibility: {
        positionGames: emptyPositionGames(),
        eligiblePositions: ["RF", "SS", "C"],
        isSP: false,
        isRP: false,
        sourceSeason: 2025,
        updatedAt: new Date().toISOString(),
      },
    });
    // POSITION_ORDER is C, 1B, 2B, 3B, SS, LF, CF, RF, DH
    expect(formatEligibilityForLeaderboard(player)).toBe("C,SS,RF");
  });

  test("formats SP only", () => {
    const player = makeBatter({
      eligibility: {
        positionGames: emptyPositionGames(),
        eligiblePositions: [],
        isSP: true,
        isRP: false,
        sourceSeason: 2025,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(formatEligibilityForLeaderboard(player)).toBe("SP");
  });

  test("formats positions with SP and RP", () => {
    const player = makeBatter({
      eligibility: {
        positionGames: emptyPositionGames(),
        eligiblePositions: ["DH"],
        isSP: true,
        isRP: true,
        sourceSeason: 2025,
        updatedAt: new Date().toISOString(),
      },
    });
    expect(formatEligibilityForLeaderboard(player)).toBe("DH / SP / RP");
  });
});

// ---------------------------------------------------------------------------
// mergeTwoWayEligibility tests
// ---------------------------------------------------------------------------
describe("mergeTwoWayEligibility", () => {
  test("preserves batting positions from batting eligibility", () => {
    const batting = computeHitterEligibility(
      { ...emptyPositionGames(), SS: 80, "3B": 40 },
      2025
    );
    const pitching = computePitcherEligibility({ G: 30, GS: 25 }, 2025);

    const merged = mergeTwoWayEligibility(batting, pitching);
    expect(merged.eligiblePositions).toContain("SS");
    expect(merged.eligiblePositions).toContain("3B");
  });

  test("preserves pitching roles from pitching eligibility", () => {
    const batting = computeHitterEligibility(
      { ...emptyPositionGames(), CF: 100 },
      2025
    );
    const pitching = computePitcherEligibility({ G: 30, GS: 25 }, 2025);

    const merged = mergeTwoWayEligibility(batting, pitching);
    expect(merged.isSP).toBe(pitching.isSP);
    expect(merged.isRP).toBe(pitching.isRP);
  });

  test("uses batting positionGames, not pitching", () => {
    const battingGames = { ...emptyPositionGames(), "1B": 50 };
    const batting = computeHitterEligibility(battingGames, 2025);
    const pitching = computePitcherEligibility({ G: 10, GS: 10 }, 2025);

    const merged = mergeTwoWayEligibility(batting, pitching);
    expect(merged.positionGames["1B"]).toBe(50);
  });

  test("merges warnings from both sides", () => {
    const batting = computeHitterEligibility(emptyPositionGames(), 2025, ["bat-warn"]);
    const pitching = computePitcherEligibility({ G: 0, GS: 0 }, 2025, ["pitch-warn"]);

    const merged = mergeTwoWayEligibility(batting, pitching);
    expect(merged.warnings).toContain("bat-warn");
    expect(merged.warnings).toContain("pitch-warn");
  });
});
