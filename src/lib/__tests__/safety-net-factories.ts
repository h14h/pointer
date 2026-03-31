// Safety Net Factories
// Shared test data builders for all safety-net scenarios.
// Follows existing codebase convention: createX(overrides?: Partial<Type>): Type

import type {
  BatterPlayer,
  PitcherPlayer,
  TwoWayPlayer,
  ScoringSettings,
  LeagueSettings,
  RosterSettings,
  RosterSlot,
  DraftState,
  ProjectionGroup,
  Eligibility,
  Position,
} from "./safety-net-harness";

// ---- ID generation ----

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// ---- Eligibility ----

export function createEligibility(
  overrides?: Partial<Eligibility>
): Eligibility {
  return {
    positionGames: {
      C: 0,
      "1B": 0,
      "2B": 0,
      "3B": 0,
      SS: 0,
      LF: 0,
      CF: 0,
      RF: 0,
      DH: 0,
    },
    eligiblePositions: [],
    isSP: false,
    isRP: false,
    sourceSeason: 2025,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---- Players ----

export function createBatter(
  overrides?: Partial<BatterPlayer>
): BatterPlayer {
  const id = overrides?._id ?? nextId("bat");
  return {
    _type: "batter",
    _id: id,
    Name: "Test Batter",
    Team: "TST",
    PlayerId: id,
    MLBAMID: id,
    G: 150,
    PA: 600,
    AB: 540,
    H: 160,
    "1B": 100,
    "2B": 30,
    "3B": 5,
    HR: 25,
    R: 90,
    RBI: 85,
    BB: 55,
    IBB: 3,
    SO: 120,
    HBP: 5,
    SF: 4,
    SH: 0,
    GDP: 10,
    SB: 15,
    CS: 4,
    AVG: 0.296,
    OBP: 0.37,
    SLG: 0.5,
    OPS: 0.87,
    ISO: 0.204,
    BABIP: 0.31,
    "wRC+": 135,
    WAR: 4.5,
    ADP: null,
    ...overrides,
  };
}

export function createPitcher(
  overrides?: Partial<PitcherPlayer>
): PitcherPlayer {
  const id = overrides?._id ?? nextId("pit");
  return {
    _type: "pitcher",
    _id: id,
    Name: "Test Pitcher",
    Team: "TST",
    PlayerId: id,
    MLBAMID: id,
    W: 12,
    L: 6,
    QS: 16,
    CG: 1,
    ShO: 0,
    G: 32,
    GS: 30,
    SV: 0,
    HLD: 0,
    BS: 0,
    IP: 190,
    H: 155,
    R: 65,
    ER: 60,
    HR: 18,
    BB: 45,
    IBB: 2,
    HBP: 5,
    SO: 200,
    ERA: 2.84,
    WHIP: 1.05,
    "K/9": 9.5,
    "BB/9": 2.1,
    FIP: 3.1,
    WAR: 4.0,
    ADP: null,
    ...overrides,
  };
}

export function createTwoWay(
  overrides?: Partial<TwoWayPlayer>
): TwoWayPlayer {
  const id = overrides?._id ?? nextId("tw");
  return {
    _type: "two-way",
    _id: id,
    Name: "Test TwoWay",
    Team: "TST",
    PlayerId: id,
    MLBAMID: id,
    ADP: null,
    _battingStats: {
      G: 120,
      PA: 500,
      AB: 450,
      H: 130,
      "1B": 75,
      "2B": 25,
      "3B": 5,
      HR: 25,
      R: 85,
      RBI: 80,
      BB: 60,
      IBB: 2,
      SO: 110,
      HBP: 5,
      SF: 3,
      SH: 0,
      GDP: 8,
      SB: 12,
      CS: 3,
      AVG: 0.289,
      OBP: 0.37,
      SLG: 0.53,
      OPS: 0.9,
      ISO: 0.241,
      BABIP: 0.305,
      "wRC+": 145,
      WAR: 0,
    },
    _pitchingStats: {
      W: 10,
      L: 4,
      QS: 14,
      CG: 0,
      ShO: 0,
      G: 22,
      GS: 20,
      SV: 0,
      HLD: 0,
      BS: 0,
      IP: 130,
      H: 100,
      R: 45,
      ER: 40,
      HR: 12,
      BB: 38,
      IBB: 1,
      HBP: 3,
      SO: 160,
      ERA: 2.77,
      WHIP: 1.06,
      "K/9": 11.1,
      "BB/9": 2.6,
      FIP: 2.9,
      WAR: 0,
    },
    ...overrides,
  };
}

// ---- Settings ----

export function createScoringSettings(
  overrides?: Partial<ScoringSettings>
): ScoringSettings {
  return {
    name: "Test Scoring",
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
      IBB: 0,
      SO: -1,
      HBP: 1,
      SF: 0,
      GDP: 0,
      ...overrides?.batting,
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
      ...overrides?.pitching,
    },
    ...overrides,
  };
}

const ALL_ROSTER_SLOTS: RosterSlot[] = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
  "OF",
  "UTIL",
  "SP",
  "RP",
  "P",
  "CI",
  "MI",
  "IF",
  "IL",
  "NA",
];

const EMPTY_POSITIONS = Object.fromEntries(
  ALL_ROSTER_SLOTS.map((s) => [s, 0])
) as Record<RosterSlot, number>;

export function createRosterSettings(
  positionOverrides?: Partial<Record<RosterSlot, number>>,
  bench?: number
): RosterSettings {
  return {
    positions: { ...EMPTY_POSITIONS, ...positionOverrides },
    bench: bench ?? 3,
  };
}

export function createLeagueSettings(
  overrides?: Partial<LeagueSettings> & {
    positions?: Partial<Record<RosterSlot, number>>;
  }
): LeagueSettings {
  const leagueSize = overrides?.leagueSize ?? 12;
  return {
    leagueSize,
    teamNames: Array.from({ length: leagueSize }, (_, i) => `Team ${i + 1}`),
    weeklyStartLimit: null,
    roster: overrides?.roster ?? createRosterSettings(overrides?.positions),
    ...overrides,
  };
}

// ---- Draft ----

export function createDraftState(
  overrides?: Partial<DraftState>
): DraftState {
  return {
    format: "snake",
    draftedByTeam: {},
    keeperByTeam: {},
    keeperSlotByPlayer: {},
    pickIndex: 0,
    history: [],
    ...overrides,
  };
}

// ---- Projection Group ----

export function createProjectionGroup(
  overrides?: Partial<ProjectionGroup>
): ProjectionGroup {
  return {
    id: overrides?.id ?? nextId("grp"),
    name: "Test Group",
    createdAt: "2026-01-01T00:00:00.000Z",
    source: { kind: "upload" },
    batterIdSource: "MLBAMID",
    pitcherIdSource: "MLBAMID",
    batters: [],
    pitchers: [],
    twoWayPlayers: [],
    ...overrides,
  };
}
