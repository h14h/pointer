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

  test("parses kicker and dwarf layouts", () => {
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
