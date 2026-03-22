import { describe, expect, it } from "bun:test";
import type {
  BatterPlayer,
  LeagueSettings,
  PitcherPlayer,
  Position,
  RankedPlayer,
  RosterSlot,
} from "@/types";
import { calculatePAR } from "./calculatePAR";

const ALL_ROSTER_SLOTS: RosterSlot[] = [
  "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH",
  "OF", "UTIL", "SP", "RP", "P", "CI", "MI", "IF", "IL", "NA",
];

function createLeagueSettings(
  positions: Partial<Record<RosterSlot, number>>,
  leagueSize = 12,
  options?: { weeklyStartLimit?: number | null }
): LeagueSettings {
  return {
    leagueSize,
    teamNames: Array.from({ length: leagueSize }, (_, i) => `Team ${i + 1}`),
    weeklyStartLimit: options?.weeklyStartLimit ?? null,
    roster: {
      positions: Object.fromEntries(
        ALL_ROSTER_SLOTS.map(slot => [slot, positions[slot] ?? 0])
      ) as Record<RosterSlot, number>,
      bench: 0,
    },
  };
}

function createBatter(
  id: string,
  eligiblePositions: Position[],
  projectedPoints: number
): RankedPlayer {
  const batter: BatterPlayer = {
    Name: `Player${id}`,
    Team: "TST",
    PlayerId: id,
    MLBAMID: id,
    G: 100,
    PA: 400,
    AB: 350,
    H: 100,
    "1B": 60,
    "2B": 20,
    "3B": 5,
    HR: 15,
    R: 70,
    RBI: 70,
    BB: 40,
    IBB: 5,
    SO: 80,
    HBP: 5,
    SF: 5,
    SH: 0,
    GDP: 8,
    SB: 10,
    CS: 3,
    AVG: 0.286,
    OBP: 0.356,
    SLG: 0.45,
    OPS: 0.806,
    ISO: 0.164,
    BABIP: 0.3,
    "wRC+": 115,
    WAR: 3.2,
    ADP: null,
    _type: "batter",
    _id: id,
    eligibility: {
      positionGames: Object.fromEntries(
        ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"].map(position => [
          position,
          eligiblePositions.includes(position as Position) ? 100 : 0,
        ])
      ) as Record<Position, number>,
      eligiblePositions,
      isSP: false,
      isRP: false,
      sourceSeason: 2024,
      updatedAt: "",
    },
  };

  return {
    player: batter,
    projectedPoints,
    par: 0,
    isDrafted: false,
    isKeeper: false,
  };
}

function createPitcher(
  id: string,
  options: { isSP: boolean; isRP: boolean },
  projectedPoints: number
): RankedPlayer {
  const pitcher: PitcherPlayer = {
    Name: `Player${id}`,
    Team: "TST",
    PlayerId: id,
    MLBAMID: id,
    W: 10,
    L: 5,
    QS: 20,
    CG: 2,
    ShO: 1,
    G: 30,
    GS: options.isSP ? 30 : 0,
    SV: options.isRP ? 20 : 0,
    HLD: options.isRP ? 10 : 0,
    BS: 0,
    IP: 180,
    H: 160,
    R: 70,
    ER: 65,
    HR: 18,
    BB: 50,
    IBB: 5,
    HBP: 5,
    SO: 180,
    ERA: 3.25,
    WHIP: 1.17,
    "K/9": 9,
    "BB/9": 2.5,
    FIP: 3.4,
    WAR: 3,
    ADP: null,
    _type: "pitcher",
    _id: id,
    eligibility: {
      positionGames: {
        C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0,
      },
      eligiblePositions: [],
      isSP: options.isSP,
      isRP: options.isRP,
      sourceSeason: 2024,
      updatedAt: "",
    },
  };

  return {
    player: pitcher,
    projectedPoints,
    par: 0,
    isDrafted: false,
    isKeeper: false,
  };
}

function createBatterPool(count: number, eligiblePositions: Position[], start = 500): RankedPlayer[] {
  return Array.from({ length: count }, (_, index) =>
    createBatter(String(index + 1), eligiblePositions, start - index)
  );
}

function createPitcherPool(
  count: number,
  options: { isSP: boolean; isRP: boolean },
  start = 500
): RankedPlayer[] {
  return Array.from({ length: count }, (_, index) =>
    createPitcher(String(index + 1), options, start - index)
  );
}

function expectReplacementBoundary(result: RankedPlayer[], replacementRank: number) {
  const replacementPlayer = result.find(player => player.player.Name === `Player${replacementRank}`);
  const aboveReplacement = result.find(player => player.player.Name === `Player${replacementRank - 1}`);
  const belowReplacement = result.find(player => player.player.Name === `Player${replacementRank + 1}`);

  expect(replacementPlayer?.par).toBe(0);
  expect(aboveReplacement?.par).toBe(1);
  expect(belowReplacement?.par).toBe(-1);
}

describe("calculatePAR", () => {
  describe("single-position replacement boundaries", () => {
    it("uses the first unrostered catcher as the catcher replacement player", () => {
      const players = createBatterPool(20, ["C"], 200);
      const settings = createLeagueSettings({ C: 1 });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 13);
    });

    it("uses the first unrostered SP as the SP replacement player", () => {
      const players = createPitcherPool(40, { isSP: true, isRP: false }, 300);
      const settings = createLeagueSettings({ SP: 2 });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 25);
    });
  });

  describe("overlapping batter pools", () => {
    it("treats OF replacement as the first unrostered OF after all OF slots are filled", () => {
      const players = createBatterPool(80, ["LF", "CF", "RF"], 500);
      const settings = createLeagueSettings({ LF: 1, CF: 1, RF: 1, OF: 2 });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 61);
    });

    it("treats CI replacement as the first unrostered CI after all corner-infield slots are filled", () => {
      const players = createBatterPool(50, ["1B", "3B"], 300);
      const settings = createLeagueSettings({ "1B": 1, "3B": 1, CI: 1 });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 37);
    });

    it("treats MI replacement as the first unrostered MI after all middle-infield slots are filled", () => {
      const players = createBatterPool(50, ["2B", "SS"], 300);
      const settings = createLeagueSettings({ "2B": 1, SS: 1, MI: 1 });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 37);
    });

    it("treats IF replacement as the first unrostered infielder after all infield slots are filled", () => {
      const players = createBatterPool(80, ["1B", "2B", "3B", "SS"], 400);
      const settings = createLeagueSettings({ "1B": 1, "2B": 1, "3B": 1, SS: 1, IF: 1 });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 61);
    });

    it("treats UTIL replacement as the first unrostered hitter after all hitter slots are filled", () => {
      const players = createBatterPool(
        220,
        ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"],
        700
      );
      const settings = createLeagueSettings({
        C: 1,
        "1B": 1,
        "2B": 1,
        "3B": 1,
        SS: 1,
        OF: 5,
        CI: 1,
        MI: 1,
        IF: 1,
        UTIL: 1,
      });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 169);
    });

  });

  describe("pitcher pools", () => {
    it("treats P replacement as the first unrostered pitcher after all pitcher slots are filled", () => {
      const players = createPitcherPool(140, { isSP: true, isRP: true }, 600);
      const settings = createLeagueSettings({ SP: 2, RP: 2, P: 4 });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 97);
    });

    it("reduces SP PAR in P-only leagues when a weekly start limit caps usable starter volume", () => {
      const starters = createPitcherPool(140, { isSP: true, isRP: false }, 500);
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) => ({
        ...player,
        player: {
          ...player.player,
          _id: `rp-${index + 1}`,
          Name: `RP${index + 1}`,
          PlayerId: `rp-${index + 1}`,
          MLBAMID: `rp-${index + 1}`,
        },
      }));
      const players = [...starters, ...relievers];

      const uncapped = calculatePAR(players, createLeagueSettings({ P: 9 }));
      const capped = calculatePAR(players, createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 }));

      const uncappedStarter = uncapped.find(player => player.player.Name === "Player90");
      const cappedStarter = capped.find(player => player.player.Name === "Player90");

      expect(cappedStarter?.par ?? 0).toBeLessThan(uncappedStarter?.par ?? 0);
    });

    it("increases RP PAR in P-only leagues when a weekly start limit shifts flexible slots toward relievers", () => {
      const starters = createPitcherPool(140, { isSP: true, isRP: false }, 500);
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) => ({
        ...player,
        player: {
          ...player.player,
          _id: `rp-${index + 1}`,
          Name: `RP${index + 1}`,
          PlayerId: `rp-${index + 1}`,
          MLBAMID: `rp-${index + 1}`,
        },
      }));
      const players = [...starters, ...relievers];

      const uncapped = calculatePAR(players, createLeagueSettings({ P: 9 }));
      const capped = calculatePAR(players, createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 }));

      const uncappedReliever = uncapped.find(player => player.player.Name === "RP20");
      const cappedReliever = capped.find(player => player.player.Name === "RP20");

      expect(cappedReliever?.par ?? 0).toBeGreaterThan(uncappedReliever?.par ?? 0);
    });
  });

  describe("zero-slot fallbacks", () => {
    it("falls back to the OF pool when individual OF positions have zero slots", () => {
      const players = createBatterPool(50, ["LF"], 250);
      const settings = createLeagueSettings({ LF: 0, CF: 0, RF: 0, OF: 3 });

      const result = calculatePAR(players, settings);

      expectReplacementBoundary(result, 37);
    });
  });
});
