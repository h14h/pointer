// Fantasy football domain types. Football leagues reuse the shared draft
// machinery (DraftState, snake picks, keepers) but carry their own scoring,
// roster, and player shapes.

export type FootballPosition = "QB" | "RB" | "WR" | "TE" | "K" | "DST";

export type FootballRosterSlot = FootballPosition | "FLEX" | "SUPERFLEX";

// Per-stat point weights. Yardage weights are per-yard (0.04 = 1 pt / 25 yds).
export interface FootballScoringSettings {
  name: string;

  offense: {
    PASS_YDS: number;
    PASS_TD: number;
    PASS_INT: number;
    RUSH_YDS: number;
    RUSH_TD: number;
    REC: number;
    REC_YDS: number;
    REC_TD: number;
    TWO_PT: number;
    FUML: number;
  };

  kicking: {
    XP: number;
    XP_MISS: number;
    FG0_19: number;
    FG20_29: number;
    FG30_39: number;
    FG40_49: number;
    FG50_PLUS: number;
    FG_MISS: number;
  };

  dst: {
    SACK: number;
    INT: number;
    FR: number;
    FF: number;
    TD: number;
    SAFETY: number;
    BLK: number;
    PA0: number;
    PA1_6: number;
    PA7_13: number;
    PA14_20: number;
    PA21_27: number;
    PA28_34: number;
    PA35_PLUS: number;
  };
}

export interface FootballRosterSettings {
  positions: Record<FootballRosterSlot, number>;
  bench: number;
}

// Per-league football configuration (scoring + roster). Shared settings like
// league size, team names, and draft state live on the League itself.
export interface FootballLeagueConfig {
  scoring: FootballScoringSettings;
  roster: FootballRosterSettings;
}

// Player data from a football projections CSV upload
export interface FootballStats {
  // Identifiers
  Name: string;
  Team: string;
  PlayerId: string;
  Position: FootballPosition;
  BYE: number | null;

  // Passing
  PASS_ATT: number;
  PASS_CMP: number;
  PASS_YDS: number;
  PASS_TD: number;
  PASS_INT: number;

  // Rushing
  RUSH_ATT: number;
  RUSH_YDS: number;
  RUSH_TD: number;

  // Receiving
  TGT: number;
  REC: number;
  REC_YDS: number;
  REC_TD: number;

  // Misc
  TWO_PT: number;
  FUML: number;

  // Kicking
  FG: number;
  FGA: number;
  FG50: number;
  FG0_19: number;
  FG20_29: number;
  FG30_39: number;
  FG40_49: number;
  FG50_PLUS: number;
  FG_MISS: number;
  XPA: number;
  XP: number;
  XP_MISS: number;

  // Defense / special teams
  SACK: number;
  DST_INT: number;
  FR: number;
  FF: number;
  DST_TD: number;
  ST_TD: number;
  ST_FF: number;
  ST_FR: number;
  FR_TD: number;
  SAFETY: number;
  BLK: number;
  PTS_ALLOWED: number;
  PA0: number;
  PA1_6: number;
  PA7_13: number;
  PA14_20: number;
  PA21_27: number;
  PA28_34: number;
  PA35_PLUS: number;

  // Source-provided fantasy points (fallback for K/DST rows that ship
  // aggregate points instead of component stats)
  FPTS: number | null;

  // ADP
  ADP: number | null;
}

export type FootballPlayer = FootballStats & {
  _type: "football";
  _id: string;
};
