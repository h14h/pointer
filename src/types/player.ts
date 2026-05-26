import type { Position } from "./league";
import type { FootballPlayer } from "./football";

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

export type Eligibility = {
  positionGames: Record<Position, number>;
  eligiblePositions: Position[];
  isSP: boolean;
  isRP: boolean;
  sourceSeason: number;
  updatedAt: string;
  warnings?: string[];
};

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

export type Player = BatterPlayer | PitcherPlayer | TwoWayPlayer | FootballPlayer;
