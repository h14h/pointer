import { describe, test, expect } from "bun:test";
import type { FootballPlayer, FootballPosition } from "@/types";
import {
  buildFootballPlayerId,
  buildFootballRankedPlayers,
  calculateFootballPAR,
  calculateFootballPoints,
  calculateFootballReplacementLevels,
  defaultFootballRosterSettings,
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
    ...overrides,
  };
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
    // 28*3 + 4*2 + 35*1
    expect(calculateFootballPoints(k, standard)).toBe(127);
  });

  test("scores DST from component stats", () => {
    const dst = makePlayer({
      Position: "DST",
      SACK: 40,
      DST_INT: 15,
      FR: 10,
      DST_TD: 3,
      SAFETY: 1,
      BLK: 2,
    });
    // 40 + 30 + 20 + 18 + 2 + 4
    expect(calculateFootballPoints(dst, standard)).toBe(114);
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
