import type { Position } from "@/types";
import {
  emptyPositionGames,
  normalizePositionGames,
  POSITION_ORDER,
} from "@/lib/eligibility";

const BASE_URL = "https://statsapi.mlb.com/api/v1";

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  onRetry?: (info: { attempt: number; delayMs: number; status?: number }) => void;
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const retries = retryOptions.retries ?? 3;
  const baseDelayMs = retryOptions.baseDelayMs ?? 500;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      const shouldRetry =
        response.status === 429 || (response.status >= 500 && response.status < 600);

      if (!shouldRetry || attempt === retries) {
        return response;
      }

      const jitter = Math.floor(Math.random() * 250);
      const delayMs = baseDelayMs * 2 ** attempt + jitter;
      retryOptions.onRetry?.({ attempt: attempt + 1, delayMs, status: response.status });
      await sleep(delayMs);
    } catch {
      if (attempt === retries) throw new Error("Network error fetching MLB Stats API");
      const jitter = Math.floor(Math.random() * 250);
      const delayMs = baseDelayMs * 2 ** attempt + jitter;
      retryOptions.onRetry?.({ attempt: attempt + 1, delayMs });
      await sleep(delayMs);
    }
  }

  throw new Error("Failed to fetch MLB Stats API");
}

type StatsApiResponse = {
  stats?: Array<{
    splits?: Array<{
      player?: { id?: number };
      position?: { abbreviation?: string };
      stat?: Record<string, unknown>;
    }>;
  }>;
};

type PeopleStatsResponse = {
  people?: Array<{
    id?: number;
    primaryPosition?: { abbreviation?: string };
    stats?: Array<{
      group?: { displayName?: string };
      splits?: Array<{
        position?: { abbreviation?: string };
        stat?: Record<string, unknown>;
      }>;
    }>;
  }>;
};

function parseFieldingStats(
  data: StatsApiResponse
): Map<string, Record<Position, number>> {
  const result = new Map<string, Record<Position, number>>();
  const splits = data.stats?.[0]?.splits ?? [];

  for (const split of splits) {
    const playerId = split.player?.id;
    const position = split.position?.abbreviation as Position | undefined;
    if (!playerId || !position) continue;

    const games = Number((split.stat as Record<string, unknown>)?.games ?? 0) || 0;
    const key = String(playerId);

    if (POSITION_ORDER.includes(position)) {
      const existing = result.get(key) ?? emptyPositionGames();
      existing[position] = (existing[position] ?? 0) + games;
      result.set(key, existing);
    }
  }

  for (const [key, value] of result.entries()) {
    result.set(key, normalizePositionGames(value));
  }

  return result;
}

function parsePitchingStats(
  data: StatsApiResponse
): Map<string, { G: number; GS: number }> {
  const result = new Map<string, { G: number; GS: number }>();
  const splits = data.stats?.[0]?.splits ?? [];

  for (const split of splits) {
    const playerId = split.player?.id;
    if (!playerId) continue;
    const stat = split.stat as Record<string, unknown>;
    const G = Number(stat?.games ?? stat?.gamesPlayed ?? 0) || 0;
    const GS = Number(stat?.gamesStarted ?? 0) || 0;
    result.set(String(playerId), { G, GS });
  }

  return result;
}

function parsePeopleStats(
  data: PeopleStatsResponse
): {
  fieldingById: Map<string, Record<Position, number>>;
  pitchingById: Map<string, { G: number; GS: number }>;
  primaryPositionById: Map<string, string>;
} {
  const fieldingById = new Map<string, Record<Position, number>>();
  const pitchingById = new Map<string, { G: number; GS: number }>();
  const primaryPositionById = new Map<string, string>();

  for (const person of data.people ?? []) {
    const playerId = person.id;
    if (!playerId) continue;
    const key = String(playerId);

    const primaryPosition = person.primaryPosition?.abbreviation;
    if (primaryPosition) {
      primaryPositionById.set(key, primaryPosition);
    }

    for (const statBlock of person.stats ?? []) {
      const group = statBlock.group?.displayName;
      const splits = statBlock.splits ?? [];

      if (group === "fielding") {
        for (const split of splits) {
          const position = split.position?.abbreviation as Position | undefined;
          if (!position || !POSITION_ORDER.includes(position)) continue;
          const games = Number((split.stat as Record<string, unknown>)?.games ?? 0) || 0;
          const existing = fieldingById.get(key) ?? emptyPositionGames();
          existing[position] = (existing[position] ?? 0) + games;
          fieldingById.set(key, existing);
        }
      }

      if (group === "pitching") {
        for (const split of splits) {
          const stat = split.stat as Record<string, unknown>;
          const G = Number(stat?.games ?? stat?.gamesPlayed ?? 0) || 0;
          const GS = Number(stat?.gamesStarted ?? 0) || 0;
          const current = pitchingById.get(key);
          if (!current || (G > current.G || (G === current.G && GS > current.GS))) {
            pitchingById.set(key, { G, GS });
          }
        }
      }
    }
  }

  for (const [key, value] of fieldingById.entries()) {
    fieldingById.set(key, normalizePositionGames(value));
  }

  return { fieldingById, pitchingById, primaryPositionById };
}

export async function fetchSeasonFieldingStats(
  season: number,
  retryOptions?: RetryOptions
): Promise<Map<string, Record<Position, number>>> {
  const url = `${BASE_URL}/stats?stats=season&group=fielding&season=${season}&sportId=1`;
  const response = await fetchWithRetry(url, {}, retryOptions);
  if (!response.ok) {
    throw new Error(`Failed to fetch fielding stats (${response.status})`);
  }
  const data = (await response.json()) as StatsApiResponse;
  return parseFieldingStats(data);
}

export async function fetchSeasonPitchingStats(
  season: number,
  retryOptions?: RetryOptions
): Promise<Map<string, { G: number; GS: number }>> {
  const url = `${BASE_URL}/stats?stats=season&group=pitching&season=${season}&sportId=1`;
  const response = await fetchWithRetry(url, {}, retryOptions);
  if (!response.ok) {
    throw new Error(`Failed to fetch pitching stats (${response.status})`);
  }
  const data = (await response.json()) as StatsApiResponse;
  return parsePitchingStats(data);
}

export async function fetchSeasonStatsForPlayers(
  personIds: string[],
  season: number,
  retryOptions?: RetryOptions
): Promise<{
  fieldingById: Map<string, Record<Position, number>>;
  pitchingById: Map<string, { G: number; GS: number }>;
  primaryPositionById: Map<string, string>;
}> {
  const uniqueIds = Array.from(new Set(personIds.filter(Boolean)));
  const fieldingById = new Map<string, Record<Position, number>>();
  const pitchingById = new Map<string, { G: number; GS: number }>();
  const primaryPositionById = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return { fieldingById, pitchingById, primaryPositionById };
  }

  const batchSize = 50;
  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const params = new URLSearchParams({
      personIds: batch.join(","),
      hydrate: `stats(group=[fielding,pitching],type=[season],season=${season})`,
    });
    const url = `${BASE_URL}/people?${params.toString()}`;
    const response = await fetchWithRetry(url, {}, retryOptions);
    if (!response.ok) {
      throw new Error(`Failed to fetch player stats (${response.status})`);
    }
    const data = (await response.json()) as PeopleStatsResponse;
    const parsed = parsePeopleStats(data);
    for (const [key, value] of parsed.fieldingById.entries()) {
      fieldingById.set(key, value);
    }
    for (const [key, value] of parsed.pitchingById.entries()) {
      pitchingById.set(key, value);
    }
    for (const [key, value] of parsed.primaryPositionById.entries()) {
      primaryPositionById.set(key, value);
    }
  }

  return { fieldingById, pitchingById, primaryPositionById };
}

export const _internal = {
  parseFieldingStats,
  parsePitchingStats,
  parsePeopleStats,
  fetchWithRetry,
};
