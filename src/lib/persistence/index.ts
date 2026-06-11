import type { StateStorage } from "zustand/middleware";
import type {
  League,
  LeagueSettings,
  ProjectionGroup,
  ScoringSettings,
  IdSource,
  Player,
  TwoWayPlayer,
} from "@/types";
import {
  normalizeLeague,
  normalizeScoringSettings,
  normalizeLeagueSettings,
  defaultScoringSettings,
  defaultLeagueSettings,
} from "@/lib/league";
import { migrateDraftState, type LegacyDraftState } from "@/lib/draft";
import {
  getProjectionGroupFallbackId,
  normalizeProjectionGroups,
} from "@/lib/projections";
import { db } from "@/lib/db";
import { randomUUID } from "@/lib/uuid";

// ---------------------------------------------------------------------------
// Dexie-backed storage adapter
// ---------------------------------------------------------------------------

export const dexieStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    const record = await db.store.where("key").equals(name).first();
    return record?.value ?? null;
  },

  async setItem(name: string, value: string): Promise<void> {
    const existing = await db.store.where("key").equals(name).first();
    if (existing?.id != null) {
      await db.store.update(existing.id, { value, updatedAt: Date.now() });
    } else {
      await db.store.add({ key: name, value, updatedAt: Date.now() });
    }
  },

  async removeItem(name: string): Promise<void> {
    await db.store.where("key").equals(name).delete();
  },
};

// ---------------------------------------------------------------------------
// State migration
// ---------------------------------------------------------------------------

type PersistedStoreState = {
  leagues: League[];
  activeLeagueId: string | null;
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  isDraftMode: boolean;
  mergeTwoWayRankings: boolean;
  deletedLeagueIds?: string[];
  hasOnboarded?: boolean;
};

type V4State = {
  scoringSettings: ScoringSettings;
  leagueSettings: LeagueSettings;
  draftState: LegacyDraftState;
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  isDraftMode?: boolean;
  mergeTwoWayRankings?: boolean;
  batters?: Player[];
  pitchers?: Player[];
  twoWayPlayers?: TwoWayPlayer[];
  batterIdSource?: IdSource | null;
  pitcherIdSource?: IdSource | null;
};

/**
 * v11: projections became SPORT-scoped with a per-league source selection
 * (league.projectionGroupId). Older installs had one global active group —
 * carry that selection onto each league of the matching sport; other leagues
 * fall back to the best source of their sport.
 */
function assignLeagueProjectionSources(
  leagues: League[],
  projectionGroups: ProjectionGroup[],
  activeProjectionGroupId: string | null,
  version: number,
): League[] {
  if (version >= 11) return leagues;
  const activeGroup = projectionGroups.find((group) => group.id === activeProjectionGroupId);
  return leagues.map((league) => {
    if (league.projectionGroupId) return league;
    const sportGroups = projectionGroups.filter(
      (group) => (group.sport ?? "baseball") === league.sport,
    );
    const assigned =
      activeGroup && (activeGroup.sport ?? "baseball") === league.sport
        ? activeGroup.id
        : getProjectionGroupFallbackId(sportGroups);
    return { ...league, projectionGroupId: assigned ?? null };
  });
}

export function migrate(
  persistedState: unknown,
  version: number
): PersistedStoreState | Record<string, unknown> {
  if (version === 6 || version === 7) {
    const state = (persistedState ?? {}) as PersistedStoreState;
    const projectionGroups = normalizeProjectionGroups(state.projectionGroups ?? []);
    const activeProjectionGroupId =
      state.activeProjectionGroupId ?? getProjectionGroupFallbackId(projectionGroups);
    return {
      ...state,
      leagues: assignLeagueProjectionSources(
        (state.leagues ?? []).map(normalizeLeague),
        projectionGroups,
        activeProjectionGroupId,
        version,
      ),
      projectionGroups,
      activeProjectionGroupId,
      hasOnboarded: true,
    };
  }

  if (version >= 8) {
    const state = (persistedState ?? {}) as PersistedStoreState;
    const projectionGroups = normalizeProjectionGroups(state.projectionGroups ?? []);
    return {
      ...state,
      leagues: assignLeagueProjectionSources(
        (state.leagues ?? []).map(normalizeLeague),
        projectionGroups,
        state.activeProjectionGroupId ?? null,
        version,
      ),
      projectionGroups,
      deletedLeagueIds: state.deletedLeagueIds ?? [],
      // Anything persisted before the welcome screen existed counts as onboarded
      hasOnboarded: version >= 10 ? (state.hasOnboarded ?? true) : true,
      // v11: drafting moved to the draft-room route; the old Header toggle was
      // the only way to flip this off, so a stale `true` would freeze the
      // Board tab in legacy draft mode forever
      isDraftMode: version >= 11 ? (state.isDraftMode ?? false) : false,
    };
  }

  // Pre-v6: flat V4 shape → convert to leagues array
  const state = (persistedState ?? {}) as V4State;

  const scoringSettings = normalizeScoringSettings(state.scoringSettings ?? defaultScoringSettings);
  const leagueSettings = state.leagueSettings
    ? normalizeLeagueSettings(state.leagueSettings)
    : defaultLeagueSettings;
  const draftState = migrateDraftState(state.draftState);

  const league: League = {
    id: randomUUID(),
    name: "My League",
    sport: "baseball",
    scoringSettings,
    leagueSettings,
    draftState,
    updatedAt: Date.now(),
  };

  const projectionGroups = normalizeProjectionGroups(state.projectionGroups ?? []);
  const activeProjectionGroupId =
    state.activeProjectionGroupId ?? getProjectionGroupFallbackId(projectionGroups);

  return {
    leagues: assignLeagueProjectionSources([league], projectionGroups, activeProjectionGroupId, version),
    activeLeagueId: league.id,
    projectionGroups,
    activeProjectionGroupId,
    isDraftMode: state.isDraftMode ?? false,
    mergeTwoWayRankings: state.mergeTwoWayRankings ?? true,
    hasOnboarded: true,
  };
}
