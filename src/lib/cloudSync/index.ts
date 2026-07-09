import { normalizeLeague } from "@/lib/league";
import type { League, Sport } from "@/types";

export type SerializedCloudLeagueRecord = {
  leagueId: string;
  name: string;
  sport: Sport;
  data: string;
  updatedAt: number;
};

export type RemoteLeagueRecord = {
  leagueId: string;
  name: string;
  sport: Sport;
  league: League;
  updatedAt: number;
};

export type CloudLeagueSyncPlan = {
  isReady: boolean;
  incomingLeagues: League[];
  leaguesToUpsert: League[];
  leagueIdsToRemove: string[];
  tombstoneIdsToClear: string[];
};

export type PlanCloudLeagueSyncArgs = {
  syncEnabled: boolean;
  hasHydrated: boolean;
  localLeagues: readonly League[];
  remoteRecords: readonly RemoteLeagueRecord[] | null | undefined;
  tombstoneLeagueIds: readonly string[];
};

export type MergeIncomingCloudLeaguesArgs = {
  localLeagues: readonly League[];
  incomingLeagues: readonly League[];
  tombstoneLeagueIds: readonly string[];
};

const emptyPlan = (isReady: boolean): CloudLeagueSyncPlan => ({
  isReady,
  incomingLeagues: [],
  leaguesToUpsert: [],
  leagueIdsToRemove: [],
  tombstoneIdsToClear: [],
});

function getLeagueUpdatedAt(league: League): number {
  return Number.isFinite(league.updatedAt) ? league.updatedAt : 0;
}

export function parseRemoteLeagueRecord(
  record: SerializedCloudLeagueRecord,
): RemoteLeagueRecord | null {
  try {
    const parsed = JSON.parse(record.data) as League;
    if (!parsed || typeof parsed.id !== "string") return null;
    if (parsed.id !== record.leagueId) return null;

    const updatedAt = Number.isFinite(record.updatedAt)
      ? record.updatedAt
      : getLeagueUpdatedAt(parsed);
    const league = normalizeLeague({ ...parsed, updatedAt });

    return {
      leagueId: record.leagueId,
      name: record.name,
      sport: record.sport,
      league,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeLeagueForCloud(
  league: League,
  now: () => number = Date.now,
): SerializedCloudLeagueRecord {
  const updatedAt = Number.isFinite(league.updatedAt)
    ? league.updatedAt
    : now();
  const normalized = normalizeLeague({ ...league, updatedAt });

  return {
    leagueId: normalized.id,
    name: normalized.name,
    sport: normalized.sport,
    data: JSON.stringify(normalized),
    updatedAt,
  };
}

export function planCloudLeagueSync({
  syncEnabled,
  hasHydrated,
  localLeagues,
  remoteRecords,
  tombstoneLeagueIds,
}: PlanCloudLeagueSyncArgs): CloudLeagueSyncPlan {
  if (!syncEnabled || !hasHydrated || !remoteRecords) {
    return emptyPlan(false);
  }

  const tombstones = new Set(tombstoneLeagueIds);
  const localById = new Map(localLeagues.map((league) => [league.id, league]));
  const remoteUpdatedAtById = new Map(
    remoteRecords.map((record) => [record.leagueId, record.updatedAt]),
  );

  const incomingLeagues = remoteRecords
    .filter((record) => {
      if (tombstones.has(record.leagueId)) return false;
      const local = localById.get(record.leagueId);
      return !local || record.updatedAt > getLeagueUpdatedAt(local);
    })
    .map((record) => record.league);

  const leaguesToUpsert = localLeagues.filter((league) => {
    if (tombstones.has(league.id)) return false;
    return (
      (remoteUpdatedAtById.get(league.id) ?? 0) < getLeagueUpdatedAt(league)
    );
  });

  return {
    isReady: true,
    incomingLeagues,
    leaguesToUpsert,
    leagueIdsToRemove: tombstoneLeagueIds.filter((id) =>
      remoteUpdatedAtById.has(id),
    ),
    tombstoneIdsToClear: tombstoneLeagueIds.filter(
      (id) => !remoteUpdatedAtById.has(id),
    ),
  };
}

export function mergeIncomingCloudLeagues({
  localLeagues,
  incomingLeagues,
  tombstoneLeagueIds,
}: MergeIncomingCloudLeaguesArgs): League[] {
  if (incomingLeagues.length === 0) return [...localLeagues];

  const tombstones = new Set(tombstoneLeagueIds);
  const incomingById = new Map(
    incomingLeagues
      .map(normalizeLeague)
      .filter((league) => !tombstones.has(league.id))
      .map((league) => [league.id, league]),
  );

  const merged = localLeagues.map((league) => {
    const incoming = incomingById.get(league.id);
    if (!incoming) return league;
    incomingById.delete(league.id);
    return getLeagueUpdatedAt(incoming) > getLeagueUpdatedAt(league)
      ? incoming
      : league;
  });

  return [...merged, ...incomingById.values()];
}
