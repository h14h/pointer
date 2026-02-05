// Player data from FanGraphs CSV upload
export interface BatterStats {
  // Identifiers
  Name: string;
  Team: string;
  PlayerId: string;
  MLBAMID: string;

  // Counting stats for scoring
  G: number;
  PA: number;
  AB: number;
  H: number;
  "1B": number;
  "2B": number;
  "3B": number;
  HR: number;
  R: number;
  RBI: number;
  BB: number;
  IBB: number;
  SO: number;
  HBP: number;
  SF: number;
  SH: number;
  GDP: number;
  SB: number;
  CS: number;

  // Rate stats (for display)
  AVG: number;
  OBP: number;
  SLG: number;
  OPS: number;
  ISO: number;
  BABIP: number;
  "wRC+": number;
  WAR: number;

  // ADP
  ADP: number | null;
}

export interface PitcherStats {
  // Identifiers
  Name: string;
  Team: string;
  PlayerId: string;
  MLBAMID: string;

  // Counting stats for scoring
  W: number;
  L: number;
  QS: number;
  CG: number;
  ShO: number;
  G: number;
  GS: number;
  SV: number;
  HLD: number;
  BS: number;
  IP: number;
  H: number;  // Hits allowed
  R: number;
  ER: number;
  HR: number; // HR allowed
  BB: number;
  IBB: number;
  HBP: number;
  SO: number;

  // Rate stats (for display)
  ERA: number;
  WHIP: number;
  "K/9": number;
  "BB/9": number;
  FIP: number;
  WAR: number;

  // ADP
  ADP: number | null;
}

export type BatterPlayer = BatterStats & {
  _type: "batter";
  _id: string;
  eligibility?: Eligibility;
};

export type PitcherPlayer = PitcherStats & {
  _type: "pitcher";
  _id: string;
  eligibility?: Eligibility;
};

export type TwoWayPlayer = {
  _type: "two-way";
  _id: string;
  Name: string;
  Team: string;
  PlayerId: string;
  MLBAMID: string;
  ADP: number | null;
  _battingStats: Omit<BatterStats, "Name" | "Team" | "PlayerId" | "MLBAMID" | "ADP">;
  _pitchingStats: Omit<PitcherStats, "Name" | "Team" | "PlayerId" | "MLBAMID" | "ADP">;
  eligibility?: Eligibility;
};

export type Player = BatterPlayer | PitcherPlayer | TwoWayPlayer;

export type IdSource = "MLBAMID" | "PlayerId" | "custom" | "generated";

export type Position = "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH";

export type RosterSlot = Position | "OF" | "UTIL" | "SP" | "RP" | "P";

export type Eligibility = {
  positionGames: Record<Position, number>;
  eligiblePositions: Position[];
  isSP: boolean;
  isRP: boolean;
  sourceSeason: number;
  updatedAt: string;
  warnings?: string[];
};

export type ProjectionGroup = {
  id: string;
  name: string;
  createdAt: string;
  batters: Player[];
  pitchers: Player[];
  twoWayPlayers: TwoWayPlayer[];
  batterIdSource: IdSource | null;
  pitcherIdSource: IdSource | null;
  eligibilityImportedAt?: string;
  eligibilitySeason?: number;
};

// League scoring configuration
export interface ScoringSettings {
  name: string;

  // Batting points
  batting: {
    R: number;      // Runs
    H: number;      // Hits (if scoring all hits, not by type)
    "1B": number;   // Singles
    "2B": number;   // Doubles
    "3B": number;   // Triples
    HR: number;     // Home runs
    RBI: number;    // RBI
    SB: number;     // Stolen bases
    CS: number;     // Caught stealing (usually negative)
    BB: number;     // Walks
    SO: number;     // Strikeouts (usually negative)
    HBP: number;    // Hit by pitch
    SF: number;     // Sacrifice flies
    GDP: number;    // Grounded into double play (usually negative)
  };

  // Pitching points
  pitching: {
    IP: number;     // Innings pitched
    W: number;      // Wins
    L: number;      // Losses (usually negative)
    QS: number;     // Quality starts
    CG: number;     // Complete games
    ShO: number;    // Shutouts
    SV: number;     // Saves
    BS: number;     // Blown saves (usually negative)
    HLD: number;    // Holds
    SO: number;     // Strikeouts
    H: number;      // Hits allowed (usually negative)
    ER: number;     // Earned runs (usually negative)
    HR: number;     // HR allowed (usually negative)
    BB: number;     // Walks allowed (usually negative)
    HBP: number;    // Hit batters (usually negative)
  };
}

// Draft state
export interface DraftState {
  draftedByTeam: Record<string, string>;
  keeperByTeam: Record<string, string>;
  activeTeamIndex: number;
}

export interface RosterSettings {
  positions: Record<RosterSlot, number>;
  bench: number;
}

export interface LeagueSettings {
  leagueSize: number;
  teamNames: string[];
  roster: RosterSettings;
}

// Player with calculated points for display
export interface RankedPlayer {
  player: Player;
  projectedPoints: number;
  isDrafted: boolean;
  isKeeper: boolean;
  draftedTeamIndex?: number;
  keeperTeamIndex?: number;
}

// App state
export interface AppState {
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  scoringSettings: ScoringSettings;
  leagueSettings: LeagueSettings;
  draftState: DraftState;
  isDraftMode: boolean;
}
