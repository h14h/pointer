import type {
  FootballOverrideStat,
  FootballPlayer,
  LeaguePlayerOverrides,
  PlayerStatOverride,
} from "@/types";

export const FOOTBALL_OVERRIDE_STATS = [
  "PASS_YDS",
  "PASS_TD",
  "PASS_INT",
  "RUSH_YDS",
  "RUSH_TD",
  "REC",
  "REC_YDS",
  "REC_TD",
] as const satisfies readonly FootballOverrideStat[];

export type { FootballOverrideStat, LeaguePlayerOverrides, PlayerStatOverride };

export const FOOTBALL_OVERRIDE_STAT_LABELS: Record<FootballOverrideStat, string> = {
  PASS_YDS: "Pass Yds",
  PASS_TD: "Pass TD",
  PASS_INT: "Int",
  RUSH_YDS: "Rush Yds",
  RUSH_TD: "Rush TD",
  REC: "Rec",
  REC_YDS: "Rec Yds",
  REC_TD: "Rec TD",
};

export function isFootballOverrideStat(key: string): key is FootballOverrideStat {
  return (FOOTBALL_OVERRIDE_STATS as readonly string[]).includes(key);
}

export function applyFootballStatOverrides(
  player: FootballPlayer,
  override: PlayerStatOverride | undefined,
): FootballPlayer {
  if (!override) return player;

  let changed = false;
  const next: FootballPlayer = { ...player };
  for (const key of FOOTBALL_OVERRIDE_STATS) {
    const value = override[key];
    if (typeof value === "number" && Number.isFinite(value) && next[key] !== value) {
      next[key] = value;
      changed = true;
    }
  }
  return changed ? next : player;
}

export function setPlayerStatOverride(
  map: LeaguePlayerOverrides,
  playerId: string,
  stat: FootballOverrideStat,
  value: number | null,
): LeaguePlayerOverrides {
  if (!playerId || !isFootballOverrideStat(stat)) return map;

  const current: PlayerStatOverride = { ...(map[playerId] ?? {}) };
  if (value === null || !Number.isFinite(value)) {
    delete current[stat];
  } else {
    current[stat] = value;
  }

  const next: LeaguePlayerOverrides = { ...map };
  if (Object.keys(current).length === 0) {
    delete next[playerId];
  } else {
    next[playerId] = current;
  }
  return next;
}

export function normalizePlayerStatOverrides(
  raw: LeaguePlayerOverrides | undefined,
): LeaguePlayerOverrides {
  if (!raw || typeof raw !== "object") return {};

  const out: LeaguePlayerOverrides = {};
  for (const [playerId, override] of Object.entries(raw)) {
    if (!playerId || !override || typeof override !== "object") continue;
    const cleaned: PlayerStatOverride = {};
    for (const key of FOOTBALL_OVERRIDE_STATS) {
      const value = override[key];
      if (typeof value === "number" && Number.isFinite(value)) {
        cleaned[key] = value;
      }
    }
    if (Object.keys(cleaned).length > 0) out[playerId] = cleaned;
  }
  return out;
}

export function playerHasOverrides(
  map: LeaguePlayerOverrides | undefined,
  playerId: string,
): boolean {
  const override = map?.[playerId];
  return Boolean(override && Object.keys(override).length > 0);
}
