import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import type { FootballPlayer, FootballPosition, FootballRosterSettings } from "@/types";
import {
  buildFootballPlayerId,
  buildFootballRankedPlayers,
  calculateFootballPAR,
  calculateFootballPositionalRosterDemand,
  calculateFootballPoints,
  calculateFootballReplacementLevels,
  filterFootballRankedPlayers,
  footballScoringPresets,
  getEligibleFootballSlots,
  mergeFootballPlayers,
  normalizeFootballConfig,
  normalizeFootballPosition,
  parseFootballCsv,
  sortFootballRankedPlayers,
} from "@/lib/football";
import { createDefaultDraftState } from "@/lib/league";

function makePlayer(overrides: Partial<FootballPlayer> = {}): FootballPlayer {
  const position = overrides.Position ?? "RB";
  const name = overrides.Name ?? "Test Player";
  return {
    _type: "football",
    _id: overrides._id ?? buildFootballPlayerId(name, position),
    Name: name,
    Team: "FA",
    PlayerId: "",
    Position: position,
    BYE: null,
    PASS_ATT: 0,
    PASS_CMP: 0,
    PASS_YDS: 0,
    PASS_TD: 0,
    PASS_INT: 0,
    RUSH_ATT: 0,
    RUSH_YDS: 0,
    RUSH_TD: 0,
    TGT: 0,
    REC: 0,
    REC_YDS: 0,
    REC_TD: 0,
    TWO_PT: 0,
    FUML: 0,
    FG: 0,
    FGA: 0,
    FG50: 0,
    FG0_19: 0,
    FG20_29: 0,
    FG30_39: 0,
    FG40_49: 0,
    FG50_PLUS: 0,
    FG_MISS: 0,
    XPA: 0,
    XP: 0,
    XP_MISS: 0,
    SACK: 0,
    DST_INT: 0,
    FR: 0,
    FF: 0,
    DST_TD: 0,
    ST_TD: 0,
    ST_FF: 0,
    ST_FR: 0,
    FR_TD: 0,
    SAFETY: 0,
    BLK: 0,
    PTS_ALLOWED: 0,
    PA0: 0,
    PA1_6: 0,
    PA7_13: 0,
    PA14_20: 0,
    PA21_27: 0,
    PA28_34: 0,
    PA35_PLUS: 0,
    FPTS: null,
    ADP: null,
    ...overrides,
  };
}

function makePointCurvePlayers(
  counts: Record<FootballPosition, number>,
  start: number | Record<FootballPosition, number> = 300
): { player: FootballPlayer; projectedPoints: number }[] {
  return (Object.entries(counts) as [FootballPosition, number][]).flatMap(([position, count]) =>
    Array.from({ length: count }, (_, i) => ({
      player: makePlayer({ Name: `${position}${i + 1}`, Position: position }),
      projectedPoints: (typeof start === "number" ? start : start[position]) - i,
    }))
  );
}

const realisticFootballPointCurveStart: Record<FootballPosition, number> = {
  QB: 330,
  RB: 260,
  WR: 255,
  TE: 185,
  K: 145,
  DST: 140,
};

function positiveParCountsByPosition(
  players: { player: FootballPlayer; projectedPoints: number }[],
  parById: Map<string, number>
): Record<FootballPosition, number> {
  return players.reduce<Record<FootballPosition, number>>(
    (counts, scored) => {
      if ((parById.get(scored.player._id) ?? 0) > 0) {
        counts[scored.player.Position] += 1;
      }
      return counts;
    },
    { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 }
  );
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe("calculateFootballPoints", () => {
  const ppr = footballScoringPresets.ppr;
  const standard = footballScoringPresets.standard;

  test("scores a QB stat line with standard weights", () => {
    const qb = makePlayer({
      Position: "QB",
      PASS_YDS: 4000,
      PASS_TD: 30,
      PASS_INT: 10,
      RUSH_YDS: 250,
      RUSH_TD: 2,
      FUML: 3,
    });
    // 4000*.04 + 30*4 + 10*-2 + 250*.1 + 2*6 + 3*-2 = 160+120-20+25+12-6
    expect(calculateFootballPoints(qb, standard)).toBe(291);
  });

  test("PPR adds a point per reception over standard", () => {
    const wr = makePlayer({ Position: "WR", REC: 90, REC_YDS: 1200, REC_TD: 8 });
    const standardPoints = calculateFootballPoints(wr, standard);
    const pprPoints = calculateFootballPoints(wr, ppr);
    expect(pprPoints - standardPoints).toBe(90);
  });

  test("half PPR adds half a point per reception", () => {
    const wr = makePlayer({ Position: "WR", REC: 90 });
    expect(calculateFootballPoints(wr, footballScoringPresets.halfPpr)).toBe(45);
  });

  test("scores kickers from component stats", () => {
    const k = makePlayer({ Position: "K", FG: 28, FG50: 4, XP: 35 });
    // (28 - 4)*3 + 4*5 + 35*1
    expect(calculateFootballPoints(k, standard)).toBe(127);
  });

  test("scores kickers from field goal ranges and missed kicks", () => {
    const k = makePlayer({
      Position: "K",
      FG0_19: 1,
      FG20_29: 2,
      FG30_39: 3,
      FG40_49: 4,
      FG50_PLUS: 5,
      FG_MISS: 2,
      XP: 35,
      XP_MISS: 1,
    });
    expect(calculateFootballPoints(k, standard)).toBe(91);
  });

  test("scores DST from component stats", () => {
    const dst = makePlayer({
      Position: "DST",
      SACK: 40,
      DST_INT: 15,
      FR: 10,
      DST_TD: 3,
      PA0: 1,
      PA1_6: 2,
      PA28_34: 1,
      PA35_PLUS: 1,
      SAFETY: 1,
      BLK: 2,
    });
    // 40 + 30 + 20 + 18 + 10 + 14 - 1 - 4 + 2 + 4
    expect(calculateFootballPoints(dst, standard)).toBe(133);
  });

  test("scores special teams and fumble recovery TD stats with the same D/ST weights", () => {
    const dst = makePlayer({
      Position: "DST",
      DST_TD: 1,
      ST_TD: 2,
      FR_TD: 3,
      FF: 3,
      ST_FF: 4,
      FR: 5,
      ST_FR: 6,
    });
    expect(calculateFootballPoints(dst, standard)).toBe(65);
  });

  test("falls back to provided FPTS for K/DST rows without component stats", () => {
    const k = makePlayer({ Position: "K", FPTS: 131.5 });
    const dst = makePlayer({ Position: "DST", FPTS: 98.2 });
    expect(calculateFootballPoints(k, standard)).toBe(131.5);
    expect(calculateFootballPoints(dst, standard)).toBe(98.2);
  });

  test("does not use FPTS fallback for offensive players", () => {
    const rb = makePlayer({ Position: "RB", FPTS: 250 });
    expect(calculateFootballPoints(rb, standard)).toBe(0);
  });

  test("treats missing stat fields on legacy football rows as zero", () => {
    const legacy = {
      _type: "football",
      _id: "legacy-wr",
      Name: "Legacy Receiver",
      Team: "FA",
      PlayerId: "",
      Position: "WR",
      BYE: null,
      PASS_ATT: 0,
      PASS_CMP: 0,
      PASS_YDS: 0,
      PASS_TD: 0,
      PASS_INT: 0,
      RUSH_ATT: 0,
      RUSH_YDS: 0,
      RUSH_TD: 0,
      TGT: 0,
      REC: 75,
      REC_YDS: 900,
      REC_TD: 6,
      TWO_PT: 0,
      FUML: 0,
      FG: 0,
      FGA: 0,
      FG50: 0,
      XP: 0,
      SACK: 0,
      DST_INT: 0,
      FR: 0,
      FF: 0,
      DST_TD: 0,
      SAFETY: 0,
      BLK: 0,
      PTS_ALLOWED: 0,
      FPTS: null,
      ADP: null,
    } as FootballPlayer;

    expect(calculateFootballPoints(legacy, ppr)).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

describe("parseFootballCsv", () => {
  test("parses a generic CSV with explicit headers and a position column", () => {
    const csv = [
      "Player,Team,Pos,Bye,Pass Yds,Pass TD,Int,Rush Yds,Rush TD,Rec,Rec Yds,Rec TD,Fumbles Lost,ADP",
      "Josh Allen,BUF,QB,12,4100,32,11,520,8,0,0,0,4,8.5",
      "Bijan Robinson,ATL,RB,5,0,0,0,1450,12,55,420,3,2,1.2",
    ].join("\n");

    const result = parseFootballCsv(csv);
    expect(result.players).toHaveLength(2);
    expect(result.needsPositionSelection).toBe(false);

    const allen = result.players[0];
    expect(allen.Position).toBe("QB");
    expect(allen.PASS_YDS).toBe(4100);
    expect(allen.PASS_INT).toBe(11);
    expect(allen.RUSH_YDS).toBe(520);
    expect(allen.BYE).toBe(12);
    expect(allen.ADP).toBe(8.5);

    const bijan = result.players[1];
    expect(bijan.Position).toBe("RB");
    expect(bijan.REC).toBe(55);
    expect(bijan.FUML).toBe(2);
  });

  test("resolves FantasyPros QB layout with duplicated ATT/YDS/TDS headers", () => {
    const csv = [
      "Player,Team,ATT,CMP,YDS,TDS,INTS,ATT,YDS,TDS,FL,FPTS",
      'Josh Allen,BUF,580,390,"4,250",31,12,105,540,9,3,395.4',
    ].join("\n");

    const result = parseFootballCsv(csv);
    expect(result.players).toHaveLength(1);
    expect(result.detectedPosition).toBe("QB");

    const allen = result.players[0];
    expect(allen.PASS_ATT).toBe(580);
    expect(allen.PASS_CMP).toBe(390);
    expect(allen.PASS_YDS).toBe(4250); // comma-formatted number
    expect(allen.PASS_TD).toBe(31);
    expect(allen.PASS_INT).toBe(12);
    expect(allen.RUSH_ATT).toBe(105);
    expect(allen.RUSH_YDS).toBe(540);
    expect(allen.RUSH_TD).toBe(9);
    expect(allen.FUML).toBe(3);
    expect(allen.FPTS).toBe(395.4);
  });

  test("resolves FantasyPros RB layout (rushing block before receiving)", () => {
    const csv = [
      "Player,Team,ATT,YDS,TDS,REC,YDS,TDS,FL,FPTS",
      'Bijan Robinson,ATL,310,"1,420",13,52,400,2,1,295.0',
    ].join("\n");

    const result = parseFootballCsv(csv);
    expect(result.detectedPosition).toBe("RB");

    const bijan = result.players[0];
    expect(bijan.RUSH_ATT).toBe(310);
    expect(bijan.RUSH_YDS).toBe(1420);
    expect(bijan.RUSH_TD).toBe(13);
    expect(bijan.REC).toBe(52);
    expect(bijan.REC_YDS).toBe(400);
    expect(bijan.REC_TD).toBe(2);
  });

  test("resolves FantasyPros WR layout (receiving block before rushing)", () => {
    const csv = [
      "Player,Team,REC,YDS,TDS,ATT,YDS,TDS,FL,FPTS",
      "Justin Jefferson,MIN,105,1550,9,3,15,0,1,275.5",
    ].join("\n");

    const result = parseFootballCsv(csv);
    expect(result.detectedPosition).toBe("WR");

    const jj = result.players[0];
    expect(jj.REC).toBe(105);
    expect(jj.REC_YDS).toBe(1550);
    expect(jj.REC_TD).toBe(9);
    expect(jj.RUSH_ATT).toBe(3);
    expect(jj.RUSH_YDS).toBe(15);
  });

  test("infers TE for a receiving-only file", () => {
    const csv = ["Player,Team,REC,YDS,TDS,FL,FPTS", "Sam LaPorta,DET,80,890,7,0,170.0"].join("\n");
    expect(parseFootballCsv(csv).detectedPosition).toBe("TE");
  });

  test("parses kicker and DST layouts", () => {
    const kCsv = ["Player,Team,FG,FGA,XPT,FPTS", "Justin Tucker,BAL,32,36,38,140.0"].join("\n");
    const kResult = parseFootballCsv(kCsv);
    expect(kResult.detectedPosition).toBe("K");
    expect(kResult.players[0].FG).toBe(32);
    expect(kResult.players[0].XP).toBe(38);

    const dstCsv = [
      "Player,Team,SACK,INT,FR,FF,TD,SAFETY,PA,YDS AGN,FPTS",
      'San Francisco 49ers,SF,48,18,11,15,5,1,310,"5,200",160.0',
    ].join("\n");
    const dstResult = parseFootballCsv(dstCsv);
    expect(dstResult.detectedPosition).toBe("DST");
    const dst = dstResult.players[0];
    expect(dst.SACK).toBe(48);
    expect(dst.DST_INT).toBe(18);
    expect(dst.DST_TD).toBe(5);
    expect(dst.PTS_ALLOWED).toBe(310);
  });

  test("parses detailed kicker and DST scoring columns", () => {
    const csv = [
      "Player,Team,Pos,FG Made (0-19 yards),FG Made (20-29 yards),FG Made (30-39 yards),FG Made (40-49 yards),FG Made (50+ yards),FG Missed,PAT Made,PAT Missed,Points Allowed 0,Points Allowed 1-6,Special Teams TD,Fumble Recovery TD",
      "Scoring Sample,DST,DST,1,2,3,4,5,2,6,1,3,4,2,1",
    ].join("\n");

    const result = parseFootballCsv(csv);
    expect(result.players).toHaveLength(1);
    expect(result.players[0].FG0_19).toBe(1);
    expect(result.players[0].FG50_PLUS).toBe(5);
    expect(result.players[0].FG_MISS).toBe(2);
    expect(result.players[0].XP).toBe(6);
    expect(result.players[0].XP_MISS).toBe(1);
    expect(result.players[0].PA0).toBe(3);
    expect(result.players[0].PA1_6).toBe(4);
    expect(result.players[0].ST_TD).toBe(2);
    expect(result.players[0].FR_TD).toBe(1);
  });

  test("requests position selection when nothing can be inferred", () => {
    const csv = ["Player,Team,FPTS", "Mystery Player,FA,100"].join("\n");
    const result = parseFootballCsv(csv);
    expect(result.needsPositionSelection).toBe(true);
    expect(result.players).toHaveLength(0);
  });

  test("forcePosition assigns rows when no position column exists", () => {
    const csv = ["Player,Team,FPTS", "Mystery Player,FA,100"].join("\n");
    const result = parseFootballCsv(csv, { forcePosition: "WR" });
    expect(result.needsPositionSelection).toBe(false);
    expect(result.players[0].Position).toBe("WR");
  });

  test("normalizes position labels including ranked and D/ST forms", () => {
    expect(normalizeFootballPosition("RB12")).toBe("RB");
    expect(normalizeFootballPosition("D/ST")).toBe("DST");
    expect(normalizeFootballPosition("DEF")).toBe("DST");
    expect(normalizeFootballPosition("PK")).toBe("K");
    expect(normalizeFootballPosition("OL")).toBeNull();
  });

  test("generates stable ids from name + position", () => {
    const csv = ["Player,Team,Pos,Rush Yds", "Bijan Robinson,ATL,RB,1450"].join("\n");
    const again = ["Player,Team,Pos,Rush Yds", "Bijan Robinson,ATL,RB,1500"].join("\n");
    expect(parseFootballCsv(csv).players[0]._id).toBe(parseFootballCsv(again).players[0]._id);
  });
});

describe("mergeFootballPlayers", () => {
  test("replaces players with matching ids and appends new ones", () => {
    const existing = [makePlayer({ Name: "A", Position: "RB", RUSH_YDS: 100 })];
    const incoming = [
      makePlayer({ Name: "A", Position: "RB", RUSH_YDS: 200 }),
      makePlayer({ Name: "B", Position: "WR" }),
    ];
    const merged = mergeFootballPlayers(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.Name === "A")?.RUSH_YDS).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PAR
// ---------------------------------------------------------------------------

describe("football PAR", () => {
  test("slot eligibility includes FLEX and SUPERFLEX correctly", () => {
    expect(getEligibleFootballSlots("QB")).toEqual(["QB", "SUPERFLEX"]);
    expect(getEligibleFootballSlots("RB")).toEqual(["RB", "FLEX", "SUPERFLEX"]);
    expect(getEligibleFootballSlots("K")).toEqual(["K"]);
  });

  test("replacement level is the best player outside the starter pool", () => {
    // 2-team league, 1 RB slot each, no FLEX → top 2 RBs are starters,
    // replacement level = RB3's points.
    const players = [200, 180, 150, 120].map((points, i) => ({
      player: makePlayer({ Name: `RB${i + 1}`, Position: "RB" as FootballPosition }),
      projectedPoints: points,
    }));
    const roster = {
      positions: { QB: 0, RB: 1, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0, K: 0, DST: 0 },
      bench: 0,
    };
    const levels = calculateFootballReplacementLevels(players, roster, 2);
    expect(levels.RB).toBe(150);

    const parById = calculateFootballPAR(players, roster, 2);
    expect(parById.get(players[0].player._id)).toBe(50);
    expect(parById.get(players[2].player._id)).toBe(0);
  });

  test("replacement level accounts for bench slots", () => {
    // 2-team league, 1 RB starter and 1 bench each → top 4 RBs are rostered,
    // replacement level = RB5's points.
    const players = [200, 180, 150, 120, 90].map((points, i) => ({
      player: makePlayer({ Name: `Bench RB${i + 1}`, Position: "RB" as FootballPosition }),
      projectedPoints: points,
    }));
    const roster = {
      positions: { QB: 0, RB: 1, WR: 0, TE: 0, FLEX: 0, SUPERFLEX: 0, K: 0, DST: 0 },
      bench: 1,
    };

    const levels = calculateFootballReplacementLevels(players, roster, 2);
    expect(levels.RB).toBe(90);

    const parById = calculateFootballPAR(players, roster, 2);
    expect(parById.get(players[3].player._id)).toBe(30);
    expect(parById.get(players[4].player._id)).toBe(0);
  });

  test("positive PAR count follows realistic positional bench demand in a balanced 1-QB league", () => {
    const roster: FootballRosterSettings = {
      positions: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 2, SUPERFLEX: 0, K: 1, DST: 1 },
      bench: 5,
    };
    const players = makePointCurvePlayers(
      { QB: 40, RB: 70, WR: 70, TE: 40, K: 30, DST: 30 },
      realisticFootballPointCurveStart
    );

    const parById = calculateFootballPAR(players, roster, 10);
    const positiveParCount = positiveParCountsByPosition(players, parById);
    const demand = calculateFootballPositionalRosterDemand(roster, 10);

    expect(demand.QB).toBeGreaterThanOrEqual(18);
    expect(demand.QB).toBeLessThanOrEqual(20);
    expect(demand.RB).toBeGreaterThanOrEqual(45);
    expect(demand.WR).toBeGreaterThanOrEqual(42);
    expect(demand.K).toBe(10);
    expect(demand.DST).toBe(10);
    expect(positiveParCount.QB).toBe(demand.QB);
    expect(positiveParCount.K).toBe(demand.K);
    expect(positiveParCount.DST).toBe(demand.DST);
    expect(Math.abs(positiveParCount.RB - demand.RB)).toBeLessThanOrEqual(5);
    expect(Math.abs(positiveParCount.WR - demand.WR)).toBeLessThanOrEqual(5);
    expect(Math.abs(positiveParCount.TE - demand.TE)).toBeLessThanOrEqual(5);
  });

  test("superflex leagues increase QB roster demand without adding K/DST bench demand", () => {
    const oneQbRoster: FootballRosterSettings = {
      positions: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 0, K: 1, DST: 1 },
      bench: 5,
    };
    const superflexRoster: FootballRosterSettings = {
      positions: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 1, K: 1, DST: 1 },
      bench: 5,
    };

    const oneQbDemand = calculateFootballPositionalRosterDemand(oneQbRoster, 10);
    const superflexDemand = calculateFootballPositionalRosterDemand(superflexRoster, 10);

    expect(superflexDemand.QB).toBeGreaterThan(oneQbDemand.QB);
    expect(superflexDemand.QB).toBeGreaterThanOrEqual(30);
    expect(superflexDemand.K).toBe(10);
    expect(superflexDemand.DST).toBe(10);
  });

  test("fuzzes positional roster shares and replacement thresholds for common league shapes", () => {
    const rosterArb = fc.record({
      qb: fc.integer({ min: 1, max: 2 }),
      rb: fc.integer({ min: 1, max: 3 }),
      wr: fc.integer({ min: 2, max: 4 }),
      te: fc.integer({ min: 1, max: 2 }),
      flex: fc.integer({ min: 0, max: 3 }),
      superflex: fc.integer({ min: 0, max: 1 }),
      bench: fc.integer({ min: 3, max: 8 }),
      leagueSize: fc.integer({ min: 8, max: 14 }),
    });

    fc.assert(
      fc.property(rosterArb, ({ qb, rb, wr, te, flex, superflex, bench, leagueSize }) => {
        const roster: FootballRosterSettings = {
          positions: {
            QB: qb,
            RB: rb,
            WR: wr,
            TE: te,
            FLEX: flex,
            SUPERFLEX: superflex,
            K: 1,
            DST: 1,
          },
          bench,
        };
        const demand = calculateFootballPositionalRosterDemand(roster, leagueSize);
        const players = makePointCurvePlayers({
          QB: 80,
          RB: 220,
          WR: 220,
          TE: 120,
          K: 40,
          DST: 40,
        }, realisticFootballPointCurveStart);
        const parById = calculateFootballPAR(players, roster, leagueSize);
        const positiveParCount = positiveParCountsByPosition(players, parById);
        const totalRosterSlots =
          (qb + rb + wr + te + flex + superflex + 2 + bench) * leagueSize;
        const totalPositive = Object.values(positiveParCount).reduce((sum, count) => sum + count, 0);

        const flexibleStarterCount = (flex + superflex) * leagueSize;

        expect(totalPositive).toBe(totalRosterSlots);
        expect(demand.K).toBe(leagueSize);
        expect(demand.DST).toBe(leagueSize);
        expect(positiveParCount.K).toBe(demand.K);
        expect(positiveParCount.DST).toBe(demand.DST);
        expect(Math.abs(positiveParCount.QB - demand.QB)).toBeLessThanOrEqual(
          superflex > 0 ? leagueSize : 2
        );
        expect(Math.abs(positiveParCount.RB - demand.RB)).toBeLessThanOrEqual(
          flexibleStarterCount
        );
        expect(Math.abs(positiveParCount.WR - demand.WR)).toBeLessThanOrEqual(
          flexibleStarterCount
        );
        expect(Math.abs(positiveParCount.TE - demand.TE)).toBeLessThanOrEqual(
          flexibleStarterCount
        );

        const qbBench = demand.QB - (qb * leagueSize + Math.round(superflex * leagueSize * 0.75));
        const qbBenchCap = Math.round((superflex > 0 ? 1.6 : 1) * leagueSize);
        expect(qbBench).toBeGreaterThanOrEqual(0);
        expect(qbBench).toBeLessThanOrEqual(qbBenchCap);

        const rbWrShare = (demand.RB + demand.WR) / totalRosterSlots;
        expect(rbWrShare).toBeGreaterThanOrEqual(0.35);
        expect(rbWrShare).toBeLessThanOrEqual(0.78);
      }),
      { numRuns: 100 }
    );
  });

  test("FLEX slots absorb the best remaining RB/WR/TE", () => {
    // 1-team league: RB1 + FLEX1. Two RBs and one WR.
    const rb1 = { player: makePlayer({ Name: "RB One", Position: "RB" as FootballPosition }), projectedPoints: 200 };
    const rb2 = { player: makePlayer({ Name: "RB Two", Position: "RB" as FootballPosition }), projectedPoints: 190 };
    const wr1 = { player: makePlayer({ Name: "WR One", Position: "WR" as FootballPosition }), projectedPoints: 150 };
    const roster = {
      positions: { QB: 0, RB: 1, WR: 0, TE: 0, FLEX: 1, SUPERFLEX: 0, K: 0, DST: 0 },
      bench: 0,
    };
    // Starters: RB1 (RB slot), RB2 (FLEX). No RBs remain (RB replacement = 0);
    // the best remaining FLEX-eligible player is WR1.
    const levels = calculateFootballReplacementLevels([rb1, rb2, wr1], roster, 1);
    expect(levels.RB).toBe(0);
    expect(levels.FLEX).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// Ranking pipeline
// ---------------------------------------------------------------------------

describe("football ranking pipeline", () => {
  const config = normalizeFootballConfig(undefined);

  const group = {
    id: "g1",
    name: "Test",
    createdAt: new Date().toISOString(),
    sport: "football" as const,
    source: { kind: "upload" as const },
    batters: [],
    pitchers: [],
    twoWayPlayers: [],
    footballPlayers: [
      makePlayer({ Name: "Lamar Jackson", Position: "QB", PASS_YDS: 3800, PASS_TD: 28, RUSH_YDS: 800, RUSH_TD: 5 }),
      makePlayer({ Name: "Saquon Barkley", Position: "RB", RUSH_YDS: 1800, RUSH_TD: 14, REC: 40, REC_YDS: 280 }),
      makePlayer({ Name: "CeeDee Lamb", Position: "WR", REC: 110, REC_YDS: 1500, REC_TD: 10, ADP: 5 }),
    ],
    batterIdSource: null,
    pitcherIdSource: null,
  };

  test("builds ranked players with points, PAR, and draft status", () => {
    const draftState = createDefaultDraftState();
    const saquonId = group.footballPlayers[1]._id;
    draftState.draftedByTeam[saquonId] = "3";

    const rows = buildFootballRankedPlayers({
      activeGroup: group,
      config,
      leagueSize: 12,
      draftState,
    });

    expect(rows).toHaveLength(3);
    const saquon = rows.find((r) => r.player._id === saquonId);
    expect(saquon?.isDrafted).toBe(true);
    expect(saquon?.draftedTeamIndex).toBe(3);
    expect(saquon?.projectedPoints).toBeGreaterThan(0);
  });

  test("filters by position, draft status, and search", () => {
    const rows = buildFootballRankedPlayers({
      activeGroup: group,
      config,
      leagueSize: 12,
      draftState: createDefaultDraftState(),
    });

    expect(filterFootballRankedPlayers(rows, "QB", "all", "")).toHaveLength(1);
    expect(filterFootballRankedPlayers(rows, "FLEX", "all", "")).toHaveLength(2);
    expect(filterFootballRankedPlayers(rows, "ALL", "all", "lamb")).toHaveLength(1);
  });

  test("sorts by ADP with nulls last", () => {
    const rows = buildFootballRankedPlayers({
      activeGroup: group,
      config,
      leagueSize: 12,
      draftState: createDefaultDraftState(),
    });

    const sorted = sortFootballRankedPlayers(rows, "adp", "asc");
    expect(sorted[0].player.Name).toBe("CeeDee Lamb");
    expect(sorted[sorted.length - 1].player.ADP).toBeNull();
  });
});
