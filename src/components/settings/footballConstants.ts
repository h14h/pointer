import type { FootballRosterSlot, FootballScoringSettings } from "@/types";

type FootballScoringCategory<Section extends keyof Omit<FootballScoringSettings, "name">> = {
  key: keyof FootballScoringSettings[Section];
  label: string;
};

export type FootballOffenseCategory = FootballScoringCategory<"offense">;
export type FootballKickingCategory = FootballScoringCategory<"kicking">;
export type FootballDstCategory = FootballScoringCategory<"dst">;

export const footballOffenseGroups: {
  label: string;
  categories: FootballOffenseCategory[];
}[] = [
  {
    label: "Passing",
    categories: [
      { key: "PASS_YDS", label: "Passing Yards (per yard)" },
      { key: "PASS_TD", label: "Passing Touchdowns" },
      { key: "PASS_INT", label: "Interceptions Thrown" },
    ],
  },
  {
    label: "Rushing",
    categories: [
      { key: "RUSH_YDS", label: "Rushing Yards (per yard)" },
      { key: "RUSH_TD", label: "Rushing Touchdowns" },
    ],
  },
  {
    label: "Receiving",
    categories: [
      { key: "REC", label: "Receptions (PPR)" },
      { key: "REC_YDS", label: "Receiving Yards (per yard)" },
      { key: "REC_TD", label: "Receiving Touchdowns" },
    ],
  },
  {
    label: "Miscellaneous",
    categories: [
      { key: "TWO_PT", label: "Two-Point Conversions" },
      { key: "FUML", label: "Fumbles Lost" },
    ],
  },
];

export const footballKickingGroups: {
  label: string;
  categories: FootballKickingCategory[];
}[] = [
  {
    label: "Kicking",
    categories: [
      { key: "FG", label: "Field Goals Made" },
      { key: "FG50", label: "50+ Yard FG Bonus" },
      { key: "XP", label: "Extra Points Made" },
    ],
  },
];

export const footballDstGroups: {
  label: string;
  categories: FootballDstCategory[];
}[] = [
  {
    label: "Defense / Special Teams",
    categories: [
      { key: "SACK", label: "Sacks" },
      { key: "INT", label: "Interceptions" },
      { key: "FR", label: "Fumble Recoveries" },
      { key: "FF", label: "Forced Fumbles" },
      { key: "TD", label: "Defensive/Return TDs" },
      { key: "SAFETY", label: "Safeties" },
      { key: "BLK", label: "Blocked Kicks" },
    ],
  },
];

export const footballRosterSlotLabels: Record<FootballRosterSlot, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  FLEX: "FLEX (RB/WR/TE)",
  SUPERFLEX: "Superflex (QB/RB/WR/TE)",
  K: "K",
  DST: "D/ST",
};

export const footballStarterSlots: FootballRosterSlot[] = ["QB", "RB", "WR", "TE"];
export const footballFlexSlots: FootballRosterSlot[] = ["FLEX", "SUPERFLEX"];
export const footballSpecialSlots: FootballRosterSlot[] = ["K", "DST"];
