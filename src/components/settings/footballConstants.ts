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
      { key: "PASS_YDS", label: "Pass yd" },
      { key: "PASS_TD", label: "Pass TD" },
      { key: "PASS_INT", label: "INT thrown" },
    ],
  },
  {
    label: "Rushing",
    categories: [
      { key: "RUSH_YDS", label: "Rush yd" },
      { key: "RUSH_TD", label: "Rush TD" },
    ],
  },
  {
    label: "Receiving",
    categories: [
      { key: "REC", label: "Reception" },
      { key: "REC_YDS", label: "Rec yd" },
      { key: "REC_TD", label: "Rec TD" },
    ],
  },
  {
    label: "Misc",
    categories: [
      { key: "TWO_PT", label: "2PT" },
      { key: "FUML", label: "Fumble lost" },
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
      { key: "FG0_19", label: "FG 0-19" },
      { key: "FG20_29", label: "FG 20-29" },
      { key: "FG30_39", label: "FG 30-39" },
      { key: "FG40_49", label: "FG 40-49" },
      { key: "FG50_PLUS", label: "FG 50+" },
      { key: "XP", label: "PAT Made" },
      { key: "FG_MISS", label: "Missed FG" },
      { key: "XP_MISS", label: "Missed PAT" },
    ],
  },
];

export const footballDstGroups: {
  label: string;
  categories: FootballDstCategory[];
}[] = [
  {
    label: "D/ST",
    categories: [
      { key: "TD", label: "TD" },
      { key: "PA0", label: "PA 0" },
      { key: "PA1_6", label: "PA 1-6" },
      { key: "PA7_13", label: "PA 7-13" },
      { key: "PA14_20", label: "PA 14-20" },
      { key: "PA21_27", label: "PA 21-27" },
      { key: "PA28_34", label: "PA 28-34" },
      { key: "PA35_PLUS", label: "PA 35+" },
      { key: "SACK", label: "Sack" },
      { key: "INT", label: "INT" },
      { key: "FR", label: "FR" },
      { key: "FF", label: "FF" },
      { key: "SAFETY", label: "Safety" },
      { key: "BLK", label: "Block" },
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
