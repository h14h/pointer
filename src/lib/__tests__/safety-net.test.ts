// Safety Net Test Suite
//
// These tests exercise cross-module domain behavior as pure function pipelines.
// They validate that behavior is preserved throughout the deep-modules refactoring.
//
// INVARIANT: No test case in this file should ever need to change during any
// refactoring phase. Only the harness file's imports may be updated.

import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import {
  calculateBatterPoints,
  calculatePitcherPoints,
  calculatePlayerPoints,
  calculatePAR,
  getDraftPickContext,
  getNextOpenPickIndex,
  hasManualDraftActivity,
  hasDraftActivity,
  computeHitterEligibility,
  computePitcherEligibility,
  emptyPositionGames,
  normalizeIp,
  estimateQualityStarts,
  buildBaseRankedPlayers,
  buildFilterMetadata,
  filterRankedPlayers,
  sortLeaderboardRows,
  parsePlayerCSV,
} from "./safety-net-harness";
import type {
  ScoringSettings,
  RankedPlayer,
  Position,
} from "./safety-net-harness";
import {
  createBatter,
  createPitcher,
  createTwoWay,
  createScoringSettings,
  createLeagueSettings,
  createDraftState,
  createProjectionGroup,
  createEligibility,
} from "./safety-net-factories";

// ---- fast-check arbitraries ----

const fcBattingWeights = fc.record({
  R: fc.integer({ min: -10, max: 10 }),
  H: fc.integer({ min: -10, max: 10 }),
  "1B": fc.integer({ min: -10, max: 10 }),
  "2B": fc.integer({ min: -10, max: 10 }),
  "3B": fc.integer({ min: -10, max: 10 }),
  HR: fc.integer({ min: -10, max: 10 }),
  RBI: fc.integer({ min: -10, max: 10 }),
  SB: fc.integer({ min: -10, max: 10 }),
  CS: fc.integer({ min: -10, max: 10 }),
  BB: fc.integer({ min: -10, max: 10 }),
  IBB: fc.integer({ min: -10, max: 10 }),
  SO: fc.integer({ min: -10, max: 10 }),
  HBP: fc.integer({ min: -10, max: 10 }),
  SF: fc.integer({ min: -10, max: 10 }),
  GDP: fc.integer({ min: -10, max: 10 }),
});

const fcPitchingWeights = fc.record({
  IP: fc.integer({ min: -10, max: 10 }),
  W: fc.integer({ min: -10, max: 10 }),
  L: fc.integer({ min: -10, max: 10 }),
  QS: fc.integer({ min: -10, max: 10 }),
  CG: fc.integer({ min: -10, max: 10 }),
  ShO: fc.integer({ min: -10, max: 10 }),
  SV: fc.integer({ min: -10, max: 10 }),
  BS: fc.integer({ min: -10, max: 10 }),
  HLD: fc.integer({ min: -10, max: 10 }),
  SO: fc.integer({ min: -10, max: 10 }),
  H: fc.integer({ min: -10, max: 10 }),
  ER: fc.integer({ min: -10, max: 10 }),
  HR: fc.integer({ min: -10, max: 10 }),
  BB: fc.integer({ min: -10, max: 10 }),
  HBP: fc.integer({ min: -10, max: 10 }),
});

const ZERO_BATTING: ScoringSettings["batting"] = {
  R: 0, H: 0, "1B": 0, "2B": 0, "3B": 0, HR: 0,
  RBI: 0, SB: 0, CS: 0, BB: 0, IBB: 0,
  SO: 0, HBP: 0, SF: 0, GDP: 0,
};

const ZERO_PITCHING: ScoringSettings["pitching"] = {
  IP: 0, W: 0, L: 0, QS: 0, CG: 0, ShO: 0,
  SV: 0, BS: 0, HLD: 0, SO: 0,
  H: 0, ER: 0, HR: 0, BB: 0, HBP: 0,
};

// ============================================================================
// SCENARIO 1: Scoring determinism
// ============================================================================

describe("Safety Net: Scoring Determinism", () => {
  test("batter scoring is deterministic across random inputs", () => {
    fc.assert(
      fc.property(fcBattingWeights, (weights) => {
        const batter = createBatter();
        const a = calculateBatterPoints(batter, weights);
        const b = calculateBatterPoints(batter, weights);
        expect(a).toBe(b);
      }),
      { numRuns: 50 },
    );
  });

  test("pitcher scoring is deterministic", () => {
    fc.assert(
      fc.property(fcPitchingWeights, (weights) => {
        const pitcher = createPitcher();
        const a = calculatePitcherPoints(pitcher, weights);
        const b = calculatePitcherPoints(pitcher, weights);
        expect(a).toBe(b);
      }),
      { numRuns: 50 },
    );
  });
});

// ============================================================================
// SCENARIO 2: Zero-weight scoring
// ============================================================================

describe("Safety Net: Zero-Weight Scoring", () => {
  test("all-zero batting weights produce zero points for any batter", () => {
    fc.assert(
      fc.property(
        fc.record({
          R: fc.nat({ max: 200 }),
          H: fc.nat({ max: 200 }),
          "1B": fc.nat({ max: 200 }),
          "2B": fc.nat({ max: 60 }),
          "3B": fc.nat({ max: 20 }),
          HR: fc.nat({ max: 60 }),
          RBI: fc.nat({ max: 200 }),
          SB: fc.nat({ max: 80 }),
          CS: fc.nat({ max: 30 }),
          BB: fc.nat({ max: 150 }),
          IBB: fc.nat({ max: 20 }),
          SO: fc.nat({ max: 250 }),
          HBP: fc.nat({ max: 25 }),
          SF: fc.nat({ max: 15 }),
          GDP: fc.nat({ max: 30 }),
        }),
        (stats) => {
          const batter = createBatter(stats);
          expect(calculateBatterPoints(batter, ZERO_BATTING)).toBe(0);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("all-zero pitching weights produce zero points for any pitcher", () => {
    const pitcher = createPitcher({ IP: 200, W: 15, SO: 220, ER: 70 });
    expect(calculatePitcherPoints(pitcher, ZERO_PITCHING)).toBe(0);
  });
});

// ============================================================================
// SCENARIO 3: Scoring linearity
// ============================================================================

describe("Safety Net: Scoring Linearity", () => {
  test("doubling all batter counting stats doubles points", () => {
    fc.assert(
      fc.property(fcBattingWeights, (weights) => {
        const base = createBatter({
          R: 50, H: 0, "1B": 60, "2B": 15, "3B": 3, HR: 12,
          RBI: 45, SB: 8, CS: 2, BB: 30, IBB: 1, SO: 70,
          HBP: 3, SF: 2, GDP: 5,
        });
        const doubled = createBatter({
          R: 100, H: 0, "1B": 120, "2B": 30, "3B": 6, HR: 24,
          RBI: 90, SB: 16, CS: 4, BB: 60, IBB: 2, SO: 140,
          HBP: 6, SF: 4, GDP: 10,
        });

        const basePoints = calculateBatterPoints(base, weights);
        const doubledPoints = calculateBatterPoints(doubled, weights);

        // With integer stats and integer weights, raw sum is integer.
        // Math.round(int * 10) / 10 = int, so linearity is exact.
        expect(doubledPoints).toBe(2 * basePoints);
      }),
      { numRuns: 40 },
    );
  });
});

// ============================================================================
// SCENARIO 4: CSV parse -> batter score pipeline
// ============================================================================

describe("Safety Net: CSV Parse -> Score Pipeline", () => {
  test("parsed batter CSV produces scorable players with positive points", () => {
    const csv = [
      "Name,Team,PlayerId,MLBAMID,PA,AB,H,1B,2B,3B,HR,R,RBI,BB,IBB,SO,HBP,SF,SH,GDP,SB,CS,AVG,OBP,SLG,OPS,ISO,BABIP,wRC+,WAR,G,ADP",
      "Mike Trout,LAA,p1,m1,600,540,160,100,30,5,25,90,85,55,3,120,5,4,0,10,15,4,.296,.370,.500,.870,.204,.310,135,4.5,150,25",
    ].join("\n");

    const result = parsePlayerCSV(csv, "batter");
    expect(result.players.length).toBe(1);
    expect(result.players[0]._type).toBe("batter");

    const settings = createScoringSettings();
    const points = calculatePlayerPoints(result.players[0], settings);
    expect(typeof points).toBe("number");
    expect(Number.isFinite(points)).toBe(true);
    expect(points).toBeGreaterThan(0);
  });

  test("parsed pitcher CSV produces scorable players", () => {
    const csv = [
      "Name,Team,PlayerId,MLBAMID,W,L,QS,CG,ShO,G,GS,SV,HLD,BS,IP,H,R,ER,HR,BB,IBB,HBP,SO,ERA,WHIP,K/9,BB/9,FIP,WAR,ADP",
      "Ace Pitcher,TST,p2,m2,15,6,20,2,1,32,30,0,0,0,200,160,60,55,15,40,1,4,220,2.48,1.00,9.9,1.8,2.80,5.0,10",
    ].join("\n");

    const result = parsePlayerCSV(csv, "pitcher");
    expect(result.players.length).toBe(1);
    expect(result.players[0]._type).toBe("pitcher");

    const settings = createScoringSettings();
    const points = calculatePlayerPoints(result.players[0], settings);
    expect(typeof points).toBe("number");
    expect(Number.isFinite(points)).toBe(true);
  });
});

// ============================================================================
// SCENARIO 5: Pitcher scoring with baseball IP normalization
// ============================================================================

describe("Safety Net: Pitcher Scoring + IP Normalization", () => {
  test("baseball IP normalization changes pitcher score", () => {
    // 180.2 in baseball notation = 180 + 2/3 innings = 180.667 decimal
    const pitcher = createPitcher({ IP: 180.2 });
    const settings = createScoringSettings();

    const normalPoints = calculatePitcherPoints(pitcher, settings.pitching, false);
    const baseballIpPoints = calculatePitcherPoints(pitcher, settings.pitching, true);

    expect(typeof normalPoints).toBe("number");
    expect(typeof baseballIpPoints).toBe("number");
    // Baseball IP interprets .2 as 2/3, not 0.2, so scores differ
    expect(baseballIpPoints).not.toBe(normalPoints);
  });

  test("normalizeIp correctly interprets baseball notation", () => {
    const result = normalizeIp(180.2);
    expect(result.valid).toBe(true);
    expect(result.outs).toBe(542); // 180 * 3 + 2
    expect(result.innings).toBeCloseTo(180.667, 2);
  });
});

// ============================================================================
// SCENARIO 6: Eligibility -> PAR pipeline
// ============================================================================

describe("Safety Net: Eligibility -> PAR Pipeline", () => {
  test("computed eligibility feeds into PAR ranking", () => {
    // Compute eligibility for a SS
    const ssGames = { ...emptyPositionGames(), SS: 120 };
    const ssElig = computeHitterEligibility(ssGames, 2025);
    expect(ssElig.eligiblePositions).toContain("SS");

    // Compute eligibility for a SP
    const spElig = computePitcherEligibility({ G: 32, GS: 30 }, 2025);
    expect(spElig.isSP).toBe(true);

    const settings = createScoringSettings();
    const leagueSettings = createLeagueSettings({
      leagueSize: 10,
      positions: { SS: 1, SP: 2 },
    });

    // Create 30 SS batters with descending points
    const batters: RankedPlayer[] = Array.from({ length: 30 }, (_, i) => ({
      player: createBatter({
        _id: `ss-${i}`,
        eligibility: ssElig,
        R: 90 - i,
        "1B": 100 - i * 2,
        HR: 25 - Math.floor(i / 2),
      }),
      projectedPoints: 300 - i * 5,
      par: 0,
      isDrafted: false,
      isKeeper: false,
    }));

    // Create 30 SP pitchers with descending points
    const pitchers: RankedPlayer[] = Array.from({ length: 30 }, (_, i) => ({
      player: createPitcher({
        _id: `sp-${i}`,
        eligibility: spElig,
        SO: 220 - i * 3,
      }),
      projectedPoints: 280 - i * 4,
      par: 0,
      isDrafted: false,
      isKeeper: false,
    }));

    const result = calculatePAR([...batters, ...pitchers], leagueSettings);

    // Top SS should have positive PAR, bottom SS should have negative
    const topSS = result.find((r) => r.player._id === "ss-0");
    const bottomSS = result.find((r) => r.player._id === "ss-29");
    expect(topSS!.par).toBeGreaterThan(0);
    expect(bottomSS!.par).toBeLessThan(0);

    // Top SP should have positive PAR
    const topSP = result.find((r) => r.player._id === "sp-0");
    expect(topSP!.par).toBeGreaterThan(0);
  });
});

// ============================================================================
// SCENARIO 7: PAR replacement invariants (property)
// ============================================================================

describe("Safety Net: PAR Replacement Invariants", () => {
  test("PAR values are always finite numbers", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 14 }),
        fc.integer({ min: 1, max: 3 }),
        (leagueSize, slotsPerPos) => {
          const poolSize = leagueSize * slotsPerPos + 5;
          const elig = createEligibility({
            positionGames: { ...emptyPositionGames(), CF: 120 },
            eligiblePositions: ["CF" as Position],
          });

          const players: RankedPlayer[] = Array.from(
            { length: poolSize },
            (_, i) => ({
              player: createBatter({
                _id: `par-b-${i}`,
                PA: 600,
                eligibility: elig,
              }),
              projectedPoints: 500 - i * 10,
              par: 0,
              isDrafted: false,
              isKeeper: false,
            }),
          );

          const settings = createLeagueSettings({
            leagueSize,
            positions: { CF: slotsPerPos },
          });

          const result = calculatePAR(players, settings);

          for (const rp of result) {
            expect(Number.isFinite(rp.par)).toBe(true);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ============================================================================
// SCENARIO 8: Draft pick context invariants (property)
// ============================================================================

describe("Safety Net: Draft Pick Context", () => {
  test("team indices stay in [0, leagueSize) for any pick index", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 0, max: 500 }),
        (leagueSize, pickIndex) => {
          const ctx = getDraftPickContext(leagueSize, pickIndex, "snake");
          expect(ctx.teamIndex).toBeGreaterThanOrEqual(0);
          expect(ctx.teamIndex).toBeLessThan(leagueSize);
          expect(ctx.round).toBeGreaterThanOrEqual(1);
          expect(ctx.overallPick).toBe(pickIndex + 1);
          expect(ctx.nextTeamIndex).toBeGreaterThanOrEqual(0);
          expect(ctx.nextTeamIndex).toBeLessThan(leagueSize);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("each team picks exactly once per round in snake draft", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 16 }),
        fc.integer({ min: 0, max: 10 }),
        (leagueSize, roundIndex) => {
          const start = roundIndex * leagueSize;
          const teams = new Set<number>();
          for (let pick = start; pick < start + leagueSize; pick++) {
            const ctx = getDraftPickContext(leagueSize, pick, "snake");
            teams.add(ctx.teamIndex);
          }
          expect(teams.size).toBe(leagueSize);
        },
      ),
      { numRuns: 40 },
    );
  });
});

// ============================================================================
// SCENARIO 9: Draft state -> leaderboard isDrafted
// ============================================================================

describe("Safety Net: Draft State -> Leaderboard", () => {
  test("drafted players appear as isDrafted in buildBaseRankedPlayers", () => {
    const ssElig = createEligibility({
      positionGames: { ...emptyPositionGames(), SS: 120 },
      eligiblePositions: ["SS" as Position],
    });

    const batter = createBatter({
      _id: "drafted-1",
      PA: 600,
      eligibility: ssElig,
    });
    const undrafted = createBatter({
      _id: "undrafted-1",
      PA: 600,
      eligibility: ssElig,
    });

    const group = createProjectionGroup({
      batters: [batter, undrafted],
    });

    const draftState = createDraftState({
      draftedByTeam: { "drafted-1": "0" },
    });

    const rows = buildBaseRankedPlayers({
      activeGroup: group,
      playerView: "all",
      scoringSettings: createScoringSettings(),
      leagueSettings: createLeagueSettings({ positions: { SS: 1 } }),
      draftState,
      mergeTwoWayRankings: true,
    });

    expect(rows.length).toBe(2);

    const draftedRow = rows.find((r) => r.player._id === "drafted-1");
    const undraftedRow = rows.find((r) => r.player._id === "undrafted-1");

    expect(draftedRow!.isDrafted).toBe(true);
    expect(draftedRow!.draftedTeamIndex).toBe(0);
    expect(undraftedRow!.isDrafted).toBe(false);
  });

  test("keepers appear as isKeeper", () => {
    const ssElig = createEligibility({
      positionGames: { ...emptyPositionGames(), SS: 120 },
      eligiblePositions: ["SS" as Position],
    });

    const keeper = createBatter({
      _id: "keeper-1",
      PA: 600,
      eligibility: ssElig,
    });

    const group = createProjectionGroup({ batters: [keeper] });
    const draftState = createDraftState({
      keeperByTeam: { "keeper-1": "2" },
      keeperSlotByPlayer: { "keeper-1": 3 },
    });

    const rows = buildBaseRankedPlayers({
      activeGroup: group,
      playerView: "all",
      scoringSettings: createScoringSettings(),
      leagueSettings: createLeagueSettings({ positions: { SS: 1 } }),
      draftState,
      mergeTwoWayRankings: true,
    });

    expect(rows.length).toBe(1);
    expect(rows[0].isKeeper).toBe(true);
    expect(rows[0].keeperTeamIndex).toBe(2);
  });
});

// ============================================================================
// SCENARIO 10: Full leaderboard pipeline
// ============================================================================

describe("Safety Net: Full Leaderboard Pipeline", () => {
  test("group -> ranked -> metadata -> filtered -> sorted preserves row integrity", () => {
    const cfElig = createEligibility({
      positionGames: { ...emptyPositionGames(), CF: 120 },
      eligiblePositions: ["CF" as Position],
    });
    const spElig = createEligibility({ isSP: true });

    const batters = Array.from({ length: 5 }, (_, i) =>
      createBatter({
        _id: `lb-bat-${i}`,
        Name: `Batter ${i}`,
        PA: 600,
        R: 90 - i * 5,
        "1B": 100 - i * 10,
        HR: 30 - i * 2,
        eligibility: cfElig,
      }),
    );
    const pitcher = createPitcher({
      _id: "lb-pit-0",
      Name: "Ace Pitcher",
      IP: 190,
      SO: 220,
      W: 15,
      eligibility: spElig,
    });

    const group = createProjectionGroup({
      batters,
      pitchers: [pitcher],
    });

    const ranked = buildBaseRankedPlayers({
      activeGroup: group,
      playerView: "all",
      scoringSettings: createScoringSettings(),
      leagueSettings: createLeagueSettings({ positions: { CF: 1, SP: 1 } }),
      draftState: createDraftState(),
      mergeTwoWayRankings: true,
    });

    const withMetadata = buildFilterMetadata(ranked);

    const filtered = filterRankedPlayers({
      rows: withMetadata,
      selectedPositions: new Set(),
      isDraftMode: false,
      draftFilter: "all",
      search: "",
    });

    const sorted = sortLeaderboardRows(filtered, [
      { id: "projectedPoints", desc: true },
    ]);

    // All 6 players survive the pipeline
    expect(sorted.length).toBe(6);

    // Sorted descending by projectedPoints
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].projectedPoints).toBeGreaterThanOrEqual(
        sorted[i].projectedPoints,
      );
    }

    // Every row retains its player reference and search metadata
    for (const row of sorted) {
      expect(row.player._id).toBeTruthy();
      expect(typeof row.searchText).toBe("string");
      expect(row.searchText.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// SCENARIO 11: Filter "available" excludes drafted/keepers (property)
// ============================================================================

describe("Safety Net: Filter Available Excludes Drafted", () => {
  test("available filter never includes drafted or keeper rows", () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 20 }),
        fc.array(fc.boolean(), { minLength: 5, maxLength: 20 }),
        (draftedFlags, keeperFlags) => {
          const len = Math.min(draftedFlags.length, keeperFlags.length);
          const rows = Array.from({ length: len }, (_, i) => ({
            player: createBatter({
              _id: `filt-${i}`,
              Name: `Player ${i}`,
              Team: "TST",
              PA: 600,
            }),
            projectedPoints: 300 - i,
            par: 10 - i,
            isDrafted: draftedFlags[i],
            isKeeper: keeperFlags[i],
            draftedTeamIndex: draftedFlags[i] ? 0 : undefined,
            keeperTeamIndex: keeperFlags[i] ? 1 : undefined,
            keeperSlotIndex: null,
            searchText: `player ${i} tst`,
            positionTokens: ["CF"],
          }));

          const filtered = filterRankedPlayers({
            rows,
            selectedPositions: new Set(),
            isDraftMode: true,
            draftFilter: "available",
            search: "",
          });

          for (const row of filtered) {
            expect(row.isDrafted).toBe(false);
            expect(row.isKeeper).toBe(false);
          }
        },
      ),
      { numRuns: 40 },
    );
  });
});

// ============================================================================
// SCENARIO 12: Two-way player combined scoring
// ============================================================================

describe("Safety Net: Two-Way Player Combined Scoring", () => {
  test("combined two-way points > batting-only and > pitching-only", () => {
    const twoWay = createTwoWay({ _id: "tw-combined" });
    const settings = createScoringSettings();

    const combined = calculatePlayerPoints(twoWay, settings, "all");
    const battingOnly = calculatePlayerPoints(twoWay, settings, "batters");
    const pitchingOnly = calculatePlayerPoints(twoWay, settings, "pitchers");

    expect(combined).toBeGreaterThan(battingOnly);
    expect(combined).toBeGreaterThan(pitchingOnly);
    // Combined should approximately equal batting + pitching (within rounding)
    expect(Math.abs(combined - battingOnly - pitchingOnly)).toBeLessThanOrEqual(
      0.2,
    );
  });
});

// ============================================================================
// SCENARIO 13: Search + position filter compose correctly
// ============================================================================

describe("Safety Net: Search + Position Filter Composition", () => {
  test("search and position filters compose for correct results", () => {
    const secondBaseElig = createEligibility({
      positionGames: { ...emptyPositionGames(), "2B": 100 },
      eligiblePositions: ["2B" as Position],
    });

    const batter = createBatter({
      _id: "search-1",
      Name: "Jose Ramirez",
      Team: "CLE",
      PA: 600,
      eligibility: secondBaseElig,
    });

    const rows = buildFilterMetadata([
      {
        player: batter,
        projectedPoints: 200,
        par: 15,
        isDrafted: false,
        isKeeper: false,
      },
    ]);

    // Search by name
    const byName = filterRankedPlayers({
      rows,
      selectedPositions: new Set(),
      isDraftMode: false,
      draftFilter: "all",
      search: "ramirez",
    });
    expect(byName.length).toBe(1);

    // Filter by correct position
    const byPosition = filterRankedPlayers({
      rows,
      selectedPositions: new Set(["2B"]),
      isDraftMode: false,
      draftFilter: "all",
      search: "",
    });
    expect(byPosition.length).toBe(1);

    // Combined: search + correct position
    const combined = filterRankedPlayers({
      rows,
      selectedPositions: new Set(["2B"]),
      isDraftMode: false,
      draftFilter: "all",
      search: "ramirez",
    });
    expect(combined.length).toBe(1);

    // Wrong position excludes even with matching name
    const wrongPos = filterRankedPlayers({
      rows,
      selectedPositions: new Set(["SP"]),
      isDraftMode: false,
      draftFilter: "all",
      search: "ramirez",
    });
    expect(wrongPos.length).toBe(0);

    // Wrong name excludes even with correct position
    const wrongName = filterRankedPlayers({
      rows,
      selectedPositions: new Set(["2B"]),
      isDraftMode: false,
      draftFilter: "all",
      search: "nobody",
    });
    expect(wrongName.length).toBe(0);
  });
});
