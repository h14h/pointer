import type {
  FootballLeagueConfig,
  FootballRosterSettings,
  FootballScoringSettings,
} from "@/types";

// ---------------------------------------------------------------------------
// Scoring presets
// ---------------------------------------------------------------------------

const baseOffense = {
  PASS_YDS: 0.04, // 1 pt / 25 yds
  PASS_TD: 4,
  PASS_INT: -2,
  RUSH_YDS: 0.1, // 1 pt / 10 yds
  RUSH_TD: 6,
  REC_YDS: 0.1,
  REC_TD: 6,
  TWO_PT: 2,
  FUML: -2,
};

const baseKicking = {
  XP: 1,
  XP_MISS: -1,
  FG0_19: 3,
  FG20_29: 3,
  FG30_39: 3,
  FG40_49: 4,
  FG50_PLUS: 5,
  FG_MISS: -1,
};

const baseDst = {
  SACK: 1,
  INT: 2,
  FR: 2,
  FF: 1,
  TD: 6,
  SAFETY: 2,
  BLK: 2,
  PA0: 10,
  PA1_6: 7,
  PA7_13: 4,
  PA14_20: 1,
  PA21_27: 0,
  PA28_34: -1,
  PA35_PLUS: -4,
};

export const footballScoringPresets: Record<string, FootballScoringSettings> = {
  standard: {
    name: "Standard (Non-PPR)",
    offense: { ...baseOffense, REC: 0 },
    kicking: { ...baseKicking },
    dst: { ...baseDst },
  },

  halfPpr: {
    name: "Half PPR",
    offense: { ...baseOffense, REC: 0.5 },
    kicking: { ...baseKicking },
    dst: { ...baseDst },
  },

  ppr: {
    name: "Full PPR",
    offense: { ...baseOffense, REC: 1 },
    kicking: { ...baseKicking },
    dst: { ...baseDst },
  },

  blank: {
    name: "Blank (All Zeros)",
    offense: {
      PASS_YDS: 0,
      PASS_TD: 0,
      PASS_INT: 0,
      RUSH_YDS: 0,
      RUSH_TD: 0,
      REC: 0,
      REC_YDS: 0,
      REC_TD: 0,
      TWO_PT: 0,
      FUML: 0,
    },
    kicking: {
      XP: 0,
      XP_MISS: 0,
      FG0_19: 0,
      FG20_29: 0,
      FG30_39: 0,
      FG40_49: 0,
      FG50_PLUS: 0,
      FG_MISS: 0,
    },
    dst: {
      SACK: 0,
      INT: 0,
      FR: 0,
      FF: 0,
      TD: 0,
      SAFETY: 0,
      BLK: 0,
      PA0: 0,
      PA1_6: 0,
      PA7_13: 0,
      PA14_20: 0,
      PA21_27: 0,
      PA28_34: 0,
      PA35_PLUS: 0,
    },
  },
};

export const footballPresetNames = Object.keys(footballScoringPresets);

export const defaultFootballScoringSettings: FootballScoringSettings =
  footballScoringPresets.halfPpr;

// ---------------------------------------------------------------------------
// Roster defaults
// ---------------------------------------------------------------------------

export const defaultFootballRosterSettings: FootballRosterSettings = {
  positions: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    SUPERFLEX: 0,
    K: 1,
    DST: 1,
  },
  bench: 5,
};

export const createDefaultFootballConfig = (): FootballLeagueConfig => ({
  scoring: {
    ...defaultFootballScoringSettings,
    offense: { ...defaultFootballScoringSettings.offense },
    kicking: { ...defaultFootballScoringSettings.kicking },
    dst: { ...defaultFootballScoringSettings.dst },
  },
  roster: {
    positions: { ...defaultFootballRosterSettings.positions },
    bench: defaultFootballRosterSettings.bench,
  },
});

// ---------------------------------------------------------------------------
// Normalization (fills missing fields on persisted configs)
// ---------------------------------------------------------------------------

export function normalizeFootballConfig(
  config: FootballLeagueConfig | undefined
): FootballLeagueConfig {
  const fallback = createDefaultFootballConfig();
  if (!config) return fallback;
  return {
    scoring: {
      name: config.scoring?.name ?? fallback.scoring.name,
      offense: { ...fallback.scoring.offense, ...config.scoring?.offense },
      kicking: { ...fallback.scoring.kicking, ...config.scoring?.kicking },
      dst: { ...fallback.scoring.dst, ...config.scoring?.dst },
    },
    roster: {
      positions: { ...fallback.roster.positions, ...config.roster?.positions },
      bench: Number.isFinite(config.roster?.bench)
        ? (config.roster.bench as number)
        : fallback.roster.bench,
    },
  };
}
