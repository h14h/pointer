import type { Eligibility, Position } from "@/types";

const POSITIONS: Position[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

export function emptyPositionGames(): Record<Position, number> {
  return POSITIONS.reduce((acc, pos) => {
    acc[pos] = 0;
    return acc;
  }, {} as Record<Position, number>);
}

export function normalizePositionGames(
  raw: Partial<Record<Position, number>>
): Record<Position, number> {
  const base = emptyPositionGames();
  for (const pos of POSITIONS) {
    const value = raw[pos];
    base[pos] = typeof value === "number" && Number.isFinite(value) ? value : 0;
  }
  return base;
}

export function computeHitterEligibility(
  positionGames: Record<Position, number>,
  season: number,
  warnings?: string[]
): Eligibility {
  const totalGames = Object.values(positionGames).reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0
  );
  const threshold = Math.max(0, 0.25 * totalGames);
  const eligiblePositions = POSITIONS.filter((pos) => {
    const games = positionGames[pos] || 0;
    return games >= 20 || games >= threshold;
  });

  return {
    positionGames,
    eligiblePositions,
    isSP: false,
    isRP: false,
    sourceSeason: season,
    updatedAt: new Date().toISOString(),
    warnings,
  };
}

export function computePitcherEligibility(
  pitching: { G: number; GS: number },
  season: number,
  warnings?: string[]
): Eligibility {
  const gamesPlayed = pitching.G;
  const gamesStarted = pitching.GS;
  const hasGames = gamesPlayed > 0;
  const startRatio = hasGames ? gamesStarted / gamesPlayed : 0;
  const reliefRatio = hasGames ? (gamesPlayed - gamesStarted) / gamesPlayed : 0;

  return {
    positionGames: emptyPositionGames(),
    eligiblePositions: [],
    isSP: gamesStarted >= 5 || startRatio >= 0.25,
    isRP: Math.max(0, gamesPlayed - gamesStarted) >= 8 || reliefRatio >= 0.25,
    sourceSeason: season,
    updatedAt: new Date().toISOString(),
    warnings,
  };
}

export function mergeTwoWayEligibility(
  batting: Eligibility,
  pitching: Eligibility
): Eligibility {
  return {
    positionGames: batting.positionGames,
    eligiblePositions: batting.eligiblePositions,
    isSP: pitching.isSP,
    isRP: pitching.isRP,
    sourceSeason: batting.sourceSeason,
    updatedAt: new Date().toISOString(),
    warnings: mergeWarnings(batting.warnings, pitching.warnings),
  };
}

export function mergeWarnings(
  a?: string[],
  b?: string[]
): string[] | undefined {
  if (!a && !b) return undefined;
  const merged = new Set([...(a ?? []), ...(b ?? [])]);
  return Array.from(merged.values());
}

export const POSITION_ORDER = POSITIONS;

export function eligibilityFromProfilePosition(
  position: string,
  season: number,
  warnings?: string[]
): Eligibility {
  const normalized = position.toUpperCase();
  const positionGames = emptyPositionGames();
  const eligiblePositions: Position[] = [];
  let isSP = false;
  let isRP = false;

  if (normalized === "P") {
    isSP = true;
    isRP = true;
  } else if (normalized === "SP") {
    isSP = true;
  } else if (normalized === "RP") {
    isRP = true;
  } else if (normalized === "OF") {
    eligiblePositions.push("LF", "CF", "RF");
  } else if (normalized === "IF") {
    eligiblePositions.push("1B", "2B", "3B", "SS");
  } else if ((POSITIONS as string[]).includes(normalized)) {
    eligiblePositions.push(normalized as Position);
  } else {
    warnings = mergeWarnings(warnings, [`Unknown profile position: ${position}`]);
  }

  return {
    positionGames,
    eligiblePositions,
    isSP,
    isRP,
    sourceSeason: season,
    updatedAt: new Date().toISOString(),
    warnings,
  };
}
