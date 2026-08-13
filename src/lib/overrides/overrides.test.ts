import { describe, expect, test } from "bun:test";
import type { FootballPlayer } from "@/types";
import { buildFootballPlayerId } from "@/lib/football";
import {
  applyFootballStatOverrides,
  FOOTBALL_OVERRIDE_STATS,
  normalizePlayerStatOverrides,
  setPlayerStatOverride,
} from "./index";
import { calculateFootballPoints, footballScoringPresets } from "@/lib/football";

function makePlayer(overrides: Partial<FootballPlayer> = {}): FootballPlayer {
  const position = overrides.Position ?? "WR";
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
    REC: 80,
    REC_YDS: 1000,
    REC_TD: 6,
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

describe("football stat overlays", () => {
  test("pass-through when override is empty", () => {
    const player = makePlayer();
    const applied = applyFootballStatOverrides(player, {});
    expect(applied).toBe(player);
  });

  test("sparse replacement does not mutate the uploaded player", () => {
    const player = makePlayer({ REC_YDS: 1000, REC_TD: 6 });
    const applied = applyFootballStatOverrides(player, { REC_YDS: 1400 });
    expect(player.REC_YDS).toBe(1000);
    expect(applied.REC_YDS).toBe(1400);
    expect(applied.REC_TD).toBe(6);
    expect(applied).not.toBe(player);
  });

  test("replacement changes projected points", () => {
    const scoring = footballScoringPresets.ppr;
    const player = makePlayer({ REC: 80, REC_YDS: 1000, REC_TD: 6 });
    const base = calculateFootballPoints(player, scoring);
    const applied = applyFootballStatOverrides(player, { REC_TD: 12 });
    const next = calculateFootballPoints(applied, scoring);
    expect(next).toBeGreaterThan(base);
  });

  test("unknown / non-finite values are ignored", () => {
    const player = makePlayer({ REC_YDS: 1000 });
    const applied = applyFootballStatOverrides(player, {
      REC_YDS: Number.NaN,
      // @ts-expect-error — unknown keys must not leak into the overlay
      TGT: 200,
    });
    expect(applied.REC_YDS).toBe(1000);
    expect(applied.TGT).toBe(player.TGT);
  });

  test("set + clear drops empty player entries", () => {
    let map = setPlayerStatOverride({}, "p1", "REC_YDS", 1200);
    expect(map.p1?.REC_YDS).toBe(1200);
    map = setPlayerStatOverride(map, "p1", "REC_YDS", null);
    expect(map.p1).toBeUndefined();
  });

  test("normalize drops stats outside the short list", () => {
    const cleaned = normalizePlayerStatOverrides({
      p1: { REC_YDS: 1100, TGT: 150 } as never,
      "": { REC: 10 },
    });
    expect(cleaned).toEqual({ p1: { REC_YDS: 1100 } });
  });

  test("short list is the ranking-moving counting stats", () => {
    expect([...FOOTBALL_OVERRIDE_STATS]).toEqual([
      "PASS_YDS",
      "PASS_TD",
      "PASS_INT",
      "RUSH_YDS",
      "RUSH_TD",
      "REC",
      "REC_YDS",
      "REC_TD",
    ]);
  });
});
