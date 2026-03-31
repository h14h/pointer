import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import {
  buildBaseRankedPlayers,
  buildFilterMetadata,
  filterRankedPlayers,
  sortLeaderboardRows,
  matchesPlayerSearch,
  type LeaderboardRow,
} from "@/lib/leaderboard";
import type {
  BatterPlayer,
  PitcherPlayer,
  DraftState,
  LeagueSettings,
  ProjectionGroup,
  RankedPlayer,
  ScoringSettings,
} from "@/types";

// ---------- Factories ----------

function createScoringSettings(): ScoringSettings {
  return {
    name: "Default",
    batting: {
      R: 1,
      H: 0,
      "1B": 1,
      "2B": 2,
      "3B": 3,
      HR: 4,
      RBI: 1,
      SB: 1,
      CS: -1,
      BB: 1,
      SO: -1,
      HBP: 1,
      SF: 0,
      GDP: 0,
    },
    pitching: {
      IP: 3,
      W: 5,
      L: -5,
      QS: 3,
      CG: 0,
      ShO: 0,
      SV: 5,
      BS: -3,
      HLD: 2,
      SO: 1,
      H: -1,
      ER: -2,
      HR: -1,
      BB: -1,
      HBP: -1,
    },
  };
}

function createLeagueSettings(): LeagueSettings {
  return {
    leagueSize: 2,
    teamNames: ["Team 1", "Team 2"],
    weeklyStartLimit: null,
    roster: {
      positions: {
        C: 1,
        "1B": 1,
        "2B": 1,
        "3B": 1,
        SS: 1,
        LF: 0,
        CF: 0,
        RF: 0,
        DH: 0,
        CI: 0,
        MI: 0,
        IF: 0,
        OF: 1,
        UTIL: 1,
        SP: 0,
        RP: 0,
        P: 2,
        IL: 0,
        NA: 0,
      },
      bench: 2,
    },
  };
}

function createDraftState(): DraftState {
  return {
    format: "snake",
    draftedByTeam: {},
    keeperByTeam: {},
    keeperSlotByPlayer: {},
    pickIndex: 0,
    history: [],
  };
}

function createBatter(overrides: Partial<BatterPlayer>): BatterPlayer {
  return {
    _type: "batter",
    _id: overrides._id ?? crypto.randomUUID(),
    Name: overrides.Name ?? "Batter",
    Team: overrides.Team ?? "LAA",
    PlayerId: overrides.PlayerId ?? "1",
    MLBAMID: overrides.MLBAMID ?? "1",
    G: overrides.G ?? 0,
    PA: overrides.PA ?? 0,
    AB: overrides.AB ?? 0,
    H: overrides.H ?? 0,
    "1B": overrides["1B"] ?? 0,
    "2B": overrides["2B"] ?? 0,
    "3B": overrides["3B"] ?? 0,
    HR: overrides.HR ?? 0,
    R: overrides.R ?? 0,
    RBI: overrides.RBI ?? 0,
    BB: overrides.BB ?? 0,
    IBB: overrides.IBB ?? 0,
    SO: overrides.SO ?? 0,
    HBP: overrides.HBP ?? 0,
    SF: overrides.SF ?? 0,
    SH: overrides.SH ?? 0,
    GDP: overrides.GDP ?? 0,
    SB: overrides.SB ?? 0,
    CS: overrides.CS ?? 0,
    AVG: overrides.AVG ?? 0.25,
    OBP: overrides.OBP ?? 0.3,
    SLG: overrides.SLG ?? 0.4,
    OPS: overrides.OPS ?? 0.7,
    ISO: overrides.ISO ?? 0.15,
    BABIP: overrides.BABIP ?? 0.3,
    "wRC+": overrides["wRC+"] ?? 100,
    WAR: overrides.WAR ?? 0,
    ADP: overrides.ADP ?? null,
    eligibility: overrides.eligibility,
  };
}

function createPitcher(overrides: Partial<PitcherPlayer>): PitcherPlayer {
  return {
    _type: "pitcher",
    _id: overrides._id ?? crypto.randomUUID(),
    Name: overrides.Name ?? "Pitcher",
    Team: overrides.Team ?? "NYY",
    PlayerId: overrides.PlayerId ?? "2",
    MLBAMID: overrides.MLBAMID ?? "2",
    W: overrides.W ?? 0,
    L: overrides.L ?? 0,
    QS: overrides.QS ?? 0,
    CG: overrides.CG ?? 0,
    ShO: overrides.ShO ?? 0,
    G: overrides.G ?? 0,
    GS: overrides.GS ?? 0,
    SV: overrides.SV ?? 0,
    HLD: overrides.HLD ?? 0,
    BS: overrides.BS ?? 0,
    IP: overrides.IP ?? 0,
    H: overrides.H ?? 0,
    R: overrides.R ?? 0,
    ER: overrides.ER ?? 0,
    HR: overrides.HR ?? 0,
    BB: overrides.BB ?? 0,
    IBB: overrides.IBB ?? 0,
    HBP: overrides.HBP ?? 0,
    SO: overrides.SO ?? 0,
    ERA: overrides.ERA ?? 3,
    WHIP: overrides.WHIP ?? 1.1,
    "K/9": overrides["K/9"] ?? 9,
    "BB/9": overrides["BB/9"] ?? 2.5,
    FIP: overrides.FIP ?? 3.2,
    WAR: overrides.WAR ?? 0,
    ADP: overrides.ADP ?? null,
    eligibility: overrides.eligibility,
  };
}

function createProjectionGroup(): ProjectionGroup {
  return {
    id: "group-1",
    name: "Main",
    createdAt: "2026-03-22T00:00:00.000Z",
    source: { kind: "upload" },
    batterIdSource: "MLBAMID",
    pitcherIdSource: "MLBAMID",
    batters: [
      createBatter({
        _id: "batter-1",
        Name: "Mike Trout",
        Team: "LAA",
        HR: 35,
        R: 90,
        RBI: 85,
        BB: 70,
        SB: 10,
        "1B": 70,
        PA: 500,
        eligibility: {
          positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 110, RF: 0, DH: 0 },
          eligiblePositions: ["CF"],
          isSP: false,
          isRP: false,
          sourceSeason: 2025,
          updatedAt: "2026-03-22T00:00:00.000Z",
        },
      }),
      createBatter({
        _id: "batter-2",
        Name: "Corey Seager",
        Team: "TEX",
        HR: 30,
        R: 80,
        RBI: 88,
        "1B": 60,
        BB: 55,
        PA: 500,
        eligibility: {
          positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 120, LF: 0, CF: 0, RF: 0, DH: 0 },
          eligiblePositions: ["SS"],
          isSP: false,
          isRP: false,
          sourceSeason: 2025,
          updatedAt: "2026-03-22T00:00:00.000Z",
        },
      }),
    ],
    pitchers: [
      createPitcher({
        _id: "pitcher-1",
        Name: "Gerrit Cole",
        Team: "NYY",
        W: 14,
        QS: 18,
        SO: 210,
        IP: 180,
        ER: 60,
        H: 140,
        BB: 40,
        eligibility: {
          positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0 },
          eligiblePositions: [],
          isSP: true,
          isRP: false,
          sourceSeason: 2025,
          updatedAt: "2026-03-22T00:00:00.000Z",
        },
      }),
    ],
    twoWayPlayers: [],
  };
}

function makeRows(overrides: Partial<RankedPlayer>[]): LeaderboardRow[] {
  return buildFilterMetadata(
    overrides.map((o, i) => ({
      player: createBatter({
        _id: o.player?._id ?? `p-${i}`,
        Name: (o.player as BatterPlayer)?.Name ?? `Player ${i}`,
        Team: (o.player as BatterPlayer)?.Team ?? "TST",
        eligibility: o.player?.eligibility ?? {
          positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0 },
          eligiblePositions: ["CF"],
          isSP: false,
          isRP: false,
          sourceSeason: 2025,
          updatedAt: "",
        },
      }),
      projectedPoints: o.projectedPoints ?? 100 - i,
      par: o.par ?? 10 - i,
      isDrafted: o.isDrafted ?? false,
      isKeeper: o.isKeeper ?? false,
    }))
  );
}

// ---------- Property tests ----------

describe("leaderboard property tests", () => {
  test("filtering preserves row integrity (all fields present)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            points: fc.double({ min: -100, max: 500, noNaN: true }),
            isDrafted: fc.boolean(),
            isKeeper: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (specs) => {
          const rows = makeRows(
            specs.map((s, i) => ({
              player: createBatter({ _id: `fp-${i}`, Name: `P${i}`, Team: "TST" }),
              projectedPoints: s.points,
              isDrafted: s.isDrafted,
              isKeeper: s.isKeeper,
            }))
          );

          const filtered = filterRankedPlayers({
            rows,
            selectedPositions: new Set(),
            isDraftMode: false,
            draftFilter: "all",
            search: "",
          });

          for (const row of filtered) {
            expect(row).toHaveProperty("player");
            expect(row).toHaveProperty("projectedPoints");
            expect(row).toHaveProperty("par");
            expect(row).toHaveProperty("isDrafted");
            expect(row).toHaveProperty("isKeeper");
            expect(row).toHaveProperty("searchText");
            expect(row).toHaveProperty("positionTokens");
          }
        }
      )
    );
  });

  test("available filter excludes all drafted/keeper rows", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            points: fc.double({ min: 0, max: 500, noNaN: true }),
            isDrafted: fc.boolean(),
            isKeeper: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (specs) => {
          const rows = makeRows(
            specs.map((s, i) => ({
              player: createBatter({ _id: `av-${i}`, Name: `P${i}`, Team: "TST" }),
              projectedPoints: s.points,
              isDrafted: s.isDrafted,
              isKeeper: s.isKeeper,
            }))
          );

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
        }
      )
    );
  });

  test("sorting is deterministic", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ min: -100, max: 500, noNaN: true }),
          { minLength: 2, maxLength: 15 }
        ),
        (points) => {
          const rows = makeRows(
            points.map((pts, i) => ({
              player: createBatter({ _id: `sd-${i}`, Name: `P${i}`, Team: "TST" }),
              projectedPoints: pts,
            }))
          );

          const sorting = [{ id: "projectedPoints", desc: true }];
          const first = sortLeaderboardRows(rows, sorting);
          const second = sortLeaderboardRows(rows, sorting);

          expect(first.map((r) => r.player._id)).toEqual(
            second.map((r) => r.player._id)
          );
        }
      )
    );
  });
});

// ---------- Unit tests ----------

describe("buildBaseRankedPlayers", () => {
  test("produces correct number of rows", () => {
    const group = createProjectionGroup();
    const rows = buildBaseRankedPlayers({
      activeGroup: group,
      playerView: "all",
      scoringSettings: createScoringSettings(),
      leagueSettings: createLeagueSettings(),
      draftState: createDraftState(),
      mergeTwoWayRankings: true,
    });

    // group has 2 batters + 1 pitcher = 3 players above min thresholds
    // batter PA defaults to 0, which is below MIN_BATTER_PA (10)
    // but our factory sets PA: 500 for both batters
    // pitcher IP is 180, above MIN_PITCHER_IP (5)
    expect(rows).toHaveLength(3);
  });

  test("returns empty array for null activeGroup", () => {
    const rows = buildBaseRankedPlayers({
      activeGroup: null,
      playerView: "all",
      scoringSettings: createScoringSettings(),
      leagueSettings: createLeagueSettings(),
      draftState: createDraftState(),
      mergeTwoWayRankings: true,
    });

    expect(rows).toHaveLength(0);
  });
});

describe("filterRankedPlayers", () => {
  test("with position filter works", () => {
    const rows = makeRows([
      {
        player: createBatter({
          _id: "cf-1",
          Name: "Outfielder",
          eligibility: {
            positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 100, RF: 0, DH: 0 },
            eligiblePositions: ["CF"],
            isSP: false,
            isRP: false,
            sourceSeason: 2025,
            updatedAt: "",
          },
        }),
        projectedPoints: 200,
      },
      {
        player: createBatter({
          _id: "ss-1",
          Name: "Shortstop",
          eligibility: {
            positionGames: { C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 100, LF: 0, CF: 0, RF: 0, DH: 0 },
            eligiblePositions: ["SS"],
            isSP: false,
            isRP: false,
            sourceSeason: 2025,
            updatedAt: "",
          },
        }),
        projectedPoints: 180,
      },
    ]);

    const filtered = filterRankedPlayers({
      rows,
      selectedPositions: new Set(["SS"]),
      isDraftMode: false,
      draftFilter: "all",
      search: "",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].player._id).toBe("ss-1");
  });
});

describe("sortLeaderboardRows", () => {
  test("sorts descending by projectedPoints", () => {
    const rows = makeRows([
      { player: createBatter({ _id: "low" }), projectedPoints: 50 },
      { player: createBatter({ _id: "high" }), projectedPoints: 300 },
      { player: createBatter({ _id: "mid" }), projectedPoints: 150 },
    ]);

    const sorted = sortLeaderboardRows(rows, [
      { id: "projectedPoints", desc: true },
    ]);

    expect(sorted.map((r) => r.player._id)).toEqual(["high", "mid", "low"]);
  });

  test("returns a copy when no sorting is specified", () => {
    const rows = makeRows([
      { player: createBatter({ _id: "a" }), projectedPoints: 100 },
    ]);

    const sorted = sortLeaderboardRows(rows, []);
    expect(sorted).not.toBe(rows);
    expect(sorted).toEqual(rows);
  });
});

describe("search filtering", () => {
  test("finds matching names via filterRankedPlayers", () => {
    const rows = makeRows([
      { player: createBatter({ _id: "mt", Name: "Mike Trout", Team: "LAA" }), projectedPoints: 300 },
      { player: createBatter({ _id: "cs", Name: "Corey Seager", Team: "TEX" }), projectedPoints: 250 },
    ]);

    const filtered = filterRankedPlayers({
      rows,
      selectedPositions: new Set(),
      isDraftMode: false,
      draftFilter: "all",
      search: "trout",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].player._id).toBe("mt");
  });

  test("matchesPlayerSearch finds by team abbreviation", () => {
    expect(matchesPlayerSearch({ Name: "Mike Trout", Team: "LAA" }, "laa")).toBe(true);
    expect(matchesPlayerSearch({ Name: "Mike Trout", Team: "LAA" }, "nyy")).toBe(false);
  });
});
