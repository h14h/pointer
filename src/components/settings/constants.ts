import type { LeagueSettings, RosterSlot, ScoringSettings } from "@/types";
import type { SettingsSectionMeta } from "@/components/settings/types";

export const settingsSections: SettingsSectionMeta[] = [
  {
    key: "scoring",
    label: "Scoring",
    description: "Weights, presets, and two-way merge behavior.",
  },
  {
    key: "roster",
    label: "Roster",
    description: "Per-team slot counts and reserves.",
  },
  {
    key: "draft",
    label: "Draft",
    description: "League size, team names, and draft order.",
  },
];

export const battingCategories: { key: keyof ScoringSettings["batting"]; label: string }[] = [
  { key: "H", label: "Hits (H) - all types" },
  { key: "1B", label: "Singles (1B)" },
  { key: "2B", label: "Doubles (2B)" },
  { key: "3B", label: "Triples (3B)" },
  { key: "HR", label: "Home Runs (HR)" },
  { key: "R", label: "Runs (R)" },
  { key: "RBI", label: "RBI" },
  { key: "BB", label: "Walks (BB)" },
  { key: "HBP", label: "Hit By Pitch (HBP)" },
  { key: "SO", label: "Strikeouts (SO)" },
  { key: "SB", label: "Stolen Bases (SB)" },
  { key: "CS", label: "Caught Stealing (CS)" },
  { key: "SF", label: "Sac Flies (SF)" },
  { key: "GDP", label: "GIDP" },
];

export const pitchingCategories: {
  key: keyof ScoringSettings["pitching"];
  label: string;
}[] = [
  { key: "IP", label: "Innings Pitched (IP)" },
  { key: "SO", label: "Strikeouts (SO)" },
  { key: "H", label: "Hits Allowed (H)" },
  { key: "ER", label: "Earned Runs (ER)" },
  { key: "HR", label: "HR Allowed (HR)" },
  { key: "BB", label: "Walks Allowed (BB)" },
  { key: "HBP", label: "Hit Batters (HBP)" },
  { key: "W", label: "Wins (W)" },
  { key: "L", label: "Losses (L)" },
  { key: "QS", label: "Quality Starts (QS)" },
  { key: "SV", label: "Saves (SV)" },
  { key: "HLD", label: "Holds (HLD)" },
  { key: "BS", label: "Blown Saves (BS)" },
  { key: "CG", label: "Complete Games (CG)" },
  { key: "ShO", label: "Shutouts (ShO)" },
];

export const rosterSlotLabels: Record<RosterSlot, string> = {
  C: "C",
  "1B": "1B",
  "2B": "2B",
  "3B": "3B",
  SS: "SS",
  LF: "LF",
  CF: "CF",
  RF: "RF",
  DH: "DH",
  CI: "CI",
  MI: "MI",
  IF: "IF",
  OF: "OF",
  UTIL: "UTIL",
  SP: "SP",
  RP: "RP",
  P: "P",
  IL: "IL",
  NA: "NA",
};

export const outfieldSlots: RosterSlot[] = ["LF", "CF", "RF"];
export const infieldSlots: RosterSlot[] = ["3B", "SS", "2B", "1B"];
export const extraSlots: RosterSlot[] = ["OF", "CI", "MI", "IF", "UTIL", "DH"];
export const pitcherSlots: RosterSlot[] = ["SP", "RP", "P"];
export const catcherSlots: RosterSlot[] = ["C"];
export const reserveSlots: RosterSlot[] = ["IL", "NA"];

export function normalizeLeagueSettingsDraft(input: LeagueSettings): LeagueSettings {
  const nextNames = [...input.teamNames];
  const clampedSize = Math.min(20, Math.max(2, Math.round(input.leagueSize || nextNames.length)));
  for (let index = nextNames.length; index < clampedSize; index += 1) {
    nextNames.push(`Team ${index + 1}`);
  }
  if (nextNames.length > clampedSize) {
    nextNames.length = clampedSize;
  }

  return {
    ...input,
    leagueSize: clampedSize,
    teamNames: nextNames,
  };
}
