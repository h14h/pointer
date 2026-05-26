import type { FootballScoringSettings, FootballRosterSlot } from "@/types";
import type { SettingsSectionMeta } from "@/components/settings/types";
import { defaultFootballScoringSettings } from "@/lib/league/footballDefaults";

type ScoringCategory<T> = { key: keyof T; label: string };
type FootballPassingCategory = ScoringCategory<FootballScoringSettings["passing"]>;
type FootballRushingCategory = ScoringCategory<FootballScoringSettings["rushing"]>;
type FootballReceivingCategory = ScoringCategory<FootballScoringSettings["receiving"]>;
type FootballMiscCategory = ScoringCategory<FootballScoringSettings["misc"]>;

export const footballPassingGroups: { label: string; categories: FootballPassingCategory[] }[] = [
  {
    label: "Passing",
    categories: [
      { key: "PassYds", label: "Passing Yards (PassYds)" },
      { key: "PassTD", label: "Passing TDs (PassTD)" },
      { key: "Int", label: "Interceptions (Int)" },
    ],
  },
];

export const footballRushingGroups: { label: string; categories: FootballRushingCategory[] }[] = [
  {
    label: "Rushing",
    categories: [
      { key: "RushYds", label: "Rushing Yards (RushYds)" },
      { key: "RushTD", label: "Rushing TDs (RushTD)" },
    ],
  },
];

export const footballReceivingGroups: { label: string; categories: FootballReceivingCategory[] }[] = [
  {
    label: "Receiving",
    categories: [
      { key: "Rec", label: "Receptions (Rec)" },
      { key: "RecYds", label: "Receiving Yards (RecYds)" },
      { key: "RecTD", label: "Receiving TDs (RecTD)" },
    ],
  },
];

export const footballMiscGroups: { label: string; categories: FootballMiscCategory[] }[] = [
  {
    label: "Misc",
    categories: [
      { key: "2PT", label: "2-Point Conversions (2PT)" },
      { key: "FumLost", label: "Fumbles Lost (FumLost)" },
    ],
  },
];

export const footballRosterSlotLabels: Record<FootballRosterSlot, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  Flex: "Flex",
  K: "K",
  DST: "DST",
  Bench: "Bench",
};

export const footballRosterGroups = [
  { label: "Offense", slots: ["QB", "RB", "WR", "TE", "Flex"] as FootballRosterSlot[] },
  { label: "Special Teams", slots: ["K", "DST"] as FootballRosterSlot[] },
  { label: "Reserves", slots: ["Bench"] as FootballRosterSlot[] },
];

export const footballScoringPresets: Record<string, FootballScoringSettings> = {
  "half-ppr": defaultFootballScoringSettings,
};

export const footballPresetNames = Object.keys(footballScoringPresets);
