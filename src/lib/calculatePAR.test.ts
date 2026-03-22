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
  options: { isSP: boolean; isRP: boolean; G?: number; GS?: number },
  projectedPoints: number
): RankedPlayer {
  const games = options.G ?? 30;
  const gamesStarted = options.GS ?? (options.isSP ? 30 : 0);
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
    G: games,
    GS: gamesStarted,
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
  options: { isSP: boolean; isRP: boolean; G?: number; GS?: number },
  start = 500
): RankedPlayer[] {
  return Array.from({ length: count }, (_, index) =>
    createPitcher(String(index + 1), options, start - index)
  );
}

function withPitcherIdentity(player: RankedPlayer, prefix: string, index: number): RankedPlayer {
  return {
    ...player,
    player: {
      ...player.player,
      _id: `${prefix}-${index + 1}`,
      Name: `${prefix.toUpperCase()}${index + 1}`,
      PlayerId: `${prefix}-${index + 1}`,
      MLBAMID: `${prefix}-${index + 1}`,
    } as PitcherPlayer,
  };
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

    it("treats RP-eligible projected starters as start-consuming in capped leagues", () => {
      const starters = createPitcherPool(140, { isSP: true, isRP: false }, 500);
      const projectedStarters = createPitcherPool(40, { isSP: false, isRP: true, G: 30, GS: 24 }, 420).map(
        (player, index) => withPitcherIdentity(player, "rs", index)
      );
      const projectedRelievers = createPitcherPool(40, { isSP: false, isRP: true, G: 30, GS: 0 }, 420).map(
        (player, index) => withPitcherIdentity(player, "rr", index)
      );
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) =>
        withPitcherIdentity(player, "rp", index)
      );
      const starterHeavyPlayers = [...starters, ...projectedStarters, ...relievers];
      const relieverHeavyPlayers = [...starters, ...projectedRelievers, ...relievers];

      const starterHeavy = calculatePAR(
        starterHeavyPlayers,
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );
      const relieverHeavy = calculatePAR(
        relieverHeavyPlayers,
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );

      const starterHeavyReliever = starterHeavy.find(player => player.player.Name === "RP20");
      const relieverHeavyReliever = relieverHeavy.find(player => player.player.Name === "RP20");

      expect(starterHeavyReliever?.par ?? 0).toBeGreaterThan(relieverHeavyReliever?.par ?? 0);
    });

    it("discounts PAR for RP-only pitchers who project entirely as starters", () => {
      const projectedStarter = createPitcher("rp-starter", { isSP: false, isRP: true, G: 30, GS: 30 }, 360);
      const projectedReliever = createPitcher("rp-reliever", { isSP: false, isRP: true, G: 30, GS: 0 }, 360);
      const starters = createPitcherPool(140, { isSP: true, isRP: false }, 500);
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) =>
        withPitcherIdentity(player, "rp", index)
      );

      const capped = calculatePAR(
        [...starters, projectedStarter, projectedReliever, ...relievers],
        createLeagueSettings({ SP: 2, RP: 2, P: 5 }, 12, { weeklyStartLimit: 12 })
      );

      const starterPar = capped.find(player => player.player.Name === "Playerrp-starter");
      const relieverPar = capped.find(player => player.player.Name === "Playerrp-reliever");

      expect(starterPar?.par ?? 0).toBeLessThan(relieverPar?.par ?? 0);
    });

    it("discounts RP-slot PAR for SP/RP-eligible pitchers who project mostly as starters", () => {
      const dualRoleStarter = createPitcher("dual-starter", { isSP: true, isRP: true, G: 30, GS: 24 }, 360);
      const dualRoleReliever = createPitcher("dual-reliever", { isSP: true, isRP: true, G: 30, GS: 0 }, 360);
      const starters = createPitcherPool(140, { isSP: true, isRP: false }, 500);
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) =>
        withPitcherIdentity(player, "rp", index)
      );

      const capped = calculatePAR(
        [...starters, dualRoleStarter, dualRoleReliever, ...relievers],
        createLeagueSettings({ SP: 2, RP: 2, P: 5 }, 12, { weeklyStartLimit: 12 })
      );

      const starterPar = capped.find(player => player.player.Name === "Playerdual-starter");
      const relieverPar = capped.find(player => player.player.Name === "Playerdual-reliever");

      expect(starterPar?.par ?? 0).toBeLessThan(relieverPar?.par ?? 0);
    });

    it("treats SP-eligible pitchers with zero projected GS as relief-only for capped-start demand", () => {
      const zeroGsSwingmen = createPitcherPool(140, { isSP: true, isRP: false, G: 40, GS: 0 }, 500).map(
        (player, index) => withPitcherIdentity(player, "sp0", index)
      );
      const actualStarters = createPitcherPool(140, { isSP: true, isRP: false, G: 40, GS: 30 }, 500).map(
        (player, index) => withPitcherIdentity(player, "sp1", index)
      );
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) =>
        withPitcherIdentity(player, "rp", index)
      );
      const zeroGsResult = calculatePAR(
        [...zeroGsSwingmen, ...relievers],
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );
      const starterResult = calculatePAR(
        [...actualStarters, ...relievers],
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );

      const zeroGsReliever = zeroGsResult.find(player => player.player.Name === "RP20");
      const starterReliever = starterResult.find(player => player.player.Name === "RP20");

      expect(zeroGsReliever?.par ?? 0).toBeLessThan(starterReliever?.par ?? 0);
    });

    it("splits swingman supply proportionally between starter and reliever replacement", () => {
      const starters = createPitcherPool(140, { isSP: true, isRP: false }, 500);
      const relieverLikeSwingmen = createPitcherPool(60, { isSP: true, isRP: true, G: 40, GS: 0 }, 410).map(
        (player, index) => withPitcherIdentity(player, "swr", index)
      );
      const balancedSwingmen = createPitcherPool(60, { isSP: true, isRP: true, G: 40, GS: 8 }, 410).map(
        (player, index) => withPitcherIdentity(player, "sw", index)
      );
      const starterLikeSwingmen = createPitcherPool(60, { isSP: true, isRP: true, G: 40, GS: 40 }, 410).map(
        (player, index) => withPitcherIdentity(player, "sws", index)
      );
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) =>
        withPitcherIdentity(player, "rp", index)
      );
      const relieverLikeResult = calculatePAR(
        [...starters, ...relieverLikeSwingmen, ...relievers],
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );
      const balancedResult = calculatePAR(
        [...starters, ...balancedSwingmen, ...relievers],
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );
      const starterLikeResult = calculatePAR(
        [...starters, ...starterLikeSwingmen, ...relievers],
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );

      const relieverLikeReliever = relieverLikeResult.find(player => player.player.Name === "RP20");
      const balancedReliever = balancedResult.find(player => player.player.Name === "RP20");
      const starterLikeReliever = starterLikeResult.find(player => player.player.Name === "RP20");

      expect(balancedReliever?.par ?? 0).toBeGreaterThan(relieverLikeReliever?.par ?? 0);
      expect(balancedReliever?.par ?? 0).toBeLessThan(starterLikeReliever?.par ?? 0);
    });

    it("uses two-way pitching GS when weighting capped-start replacement", () => {
      const starters = createPitcherPool(140, { isSP: true, isRP: false }, 500);
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) =>
        withPitcherIdentity(player, "rp", index)
      );
      const baseTwoWay = {
        player: {
          _type: "two-way" as const,
          _id: "tw-1",
          Name: "TwoWayStarter",
          Team: "TST",
          PlayerId: "tw-1",
          MLBAMID: "tw-1",
          ADP: null,
          _battingStats: {
            G: 120,
            PA: 450,
            AB: 400,
            H: 110,
            "1B": 70,
            "2B": 18,
            "3B": 4,
            HR: 18,
            R: 65,
            RBI: 68,
            BB: 35,
            IBB: 1,
            SO: 90,
            HBP: 3,
            SF: 4,
            SH: 0,
            GDP: 7,
            SB: 8,
            CS: 2,
            AVG: 0.275,
            OBP: 0.336,
            SLG: 0.442,
            OPS: 0.778,
            ISO: 0.167,
            BABIP: 0.301,
            "wRC+": 108,
            WAR: 2.8,
          },
          _pitchingStats: {
            W: 8,
            L: 4,
            QS: 15,
            CG: 1,
            ShO: 0,
            G: 25,
            GS: 20,
            SV: 0,
            HLD: 0,
            BS: 0,
            IP: 140,
            H: 120,
            R: 55,
            ER: 50,
            HR: 14,
            BB: 42,
            IBB: 2,
            HBP: 4,
            SO: 145,
            ERA: 3.21,
            WHIP: 1.16,
            "K/9": 9.3,
            "BB/9": 2.7,
            FIP: 3.35,
            WAR: 3.1,
          },
          eligibility: {
            positionGames: {
              C: 0, "1B": 0, "2B": 0, "3B": 0, SS: 0, LF: 0, CF: 0, RF: 0, DH: 0,
            },
            eligiblePositions: [],
            isSP: false,
            isRP: true,
            sourceSeason: 2024,
            updatedAt: "",
          },
        },
        projectedPoints: 430,
        par: 0,
        isDrafted: false,
        isKeeper: false,
      } satisfies RankedPlayer;
      const twoWayStarters = Array.from({ length: 20 }, (_, index) => ({
        ...baseTwoWay,
        player: {
          ...baseTwoWay.player,
          _id: `tws-${index + 1}`,
          Name: `TwoWayStarter${index + 1}`,
          PlayerId: `tws-${index + 1}`,
          MLBAMID: `tws-${index + 1}`,
        },
        projectedPoints: 430 - index,
      })) satisfies RankedPlayer[];
      const twoWayRelievers = Array.from({ length: 20 }, (_, index) => ({
        ...baseTwoWay,
        player: {
          ...baseTwoWay.player,
          _id: `twr-${index + 1}`,
          Name: `TwoWayReliever${index + 1}`,
          PlayerId: `twr-${index + 1}`,
          MLBAMID: `twr-${index + 1}`,
          _pitchingStats: {
            ...baseTwoWay.player._pitchingStats,
            GS: 0,
          },
        },
        projectedPoints: 430 - index,
      })) satisfies RankedPlayer[];

      const starterResult = calculatePAR(
        [...starters, ...twoWayStarters, ...relievers],
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );
      const relieverResult = calculatePAR(
        [...starters, ...twoWayRelievers, ...relievers],
        createLeagueSettings({ P: 9 }, 12, { weeklyStartLimit: 12 })
      );

      const starterReliever = starterResult.find(player => player.player.Name === "RP20");
      const relieverReliever = relieverResult.find(player => player.player.Name === "RP20");

      expect(starterReliever?.par ?? 0).toBeGreaterThan(relieverReliever?.par ?? 0);
    });

    it("does not round replacement-adjacent mixed-role pitchers up to zero from tiny weighted slot shares", () => {
      const starters = createPitcherPool(140, { isSP: true, isRP: false }, 500);
      const relievers = createPitcherPool(140, { isSP: false, isRP: true }, 320).map((player, index) =>
        withPitcherIdentity(player, "rp", index)
      );
      const fringeDualRole = createPitcher(
        "fringe-dual",
        { isSP: true, isRP: true, G: 30, GS: 3 },
        5
      );

      const capped = calculatePAR(
        [...starters, fringeDualRole, ...relievers],
        createLeagueSettings({ SP: 2, RP: 2, P: 5 }, 12, { weeklyStartLimit: 12 })
      );

      const fringePar = capped.find(player => player.player.Name === "Playerfringe-dual");

      expect(fringePar?.par ?? 0).toBeLessThan(0);
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
