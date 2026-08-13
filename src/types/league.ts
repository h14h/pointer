import type { DraftState } from "./draft";
import type { FootballLeagueConfig } from "./football";

export type Sport = "baseball" | "football";

export type Position = "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH";

export type RosterSlot =
  | Position
  | "OF"
  | "UTIL"
  | "SP"
  | "RP"
  | "P"
  | "CI"
  | "MI"
  | "IF"
  | "IL"
  | "NA";

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
    BB: number;     // Walks (non-intentional; BB minus IBB)
    IBB: number;    // Intentional walks
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

export interface RosterSettings {
  positions: Record<RosterSlot, number>;
  bench: number;
}

export interface LeagueSettings {
  leagueSize: number;
  teamNames: string[];
  roster: RosterSettings;
  weeklyStartLimit?: number | null;
}

// Draft-day strategy worked out on the Plan tab; carried into the draft room.
export interface LeagueStrategy {
  /** Player ids the user has flagged as targets */
  targetIds: string[];
  /** Free-form note per round, keyed by round number as a string */
  noteByRound: Record<string, string>;
}

/** Sparse per-player projected-stat replacements. Football short-list only. */
export type FootballOverrideStat =
  | "PASS_YDS"
  | "PASS_TD"
  | "PASS_INT"
  | "RUSH_YDS"
  | "RUSH_TD"
  | "REC"
  | "REC_YDS"
  | "REC_TD";

export type PlayerStatOverride = Partial<Record<FootballOverrideStat, number>>;

export type LeaguePlayerOverrides = Record<string, PlayerStatOverride>;

export interface League {
  id: string;
  name: string;
  sport: Sport;
  // Baseball scoring/roster live in scoringSettings/leagueSettings.roster;
  // football leagues keep theirs in `football` and ignore the baseball fields.
  scoringSettings: ScoringSettings;
  leagueSettings: LeagueSettings;
  football?: FootballLeagueConfig;
  draftState: DraftState;
  // Optional for backward compatibility with persisted/cloud league JSON;
  // normalizeLeague fills defaults so app code can rely on them.
  /** Index into leagueSettings.teamNames identifying the user's own team */
  myTeamIndex?: number;
  /** Projection source for this league — an id into the sport-scoped library */
  projectionGroupId?: string | null;
  strategy?: LeagueStrategy;
  /** Per-player stat overlays on the league's projection source. Cloud-synced. */
  playerStatOverrides?: LeaguePlayerOverrides;
  updatedAt: number;
}
