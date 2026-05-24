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

export function migrate(
  persistedState: unknown,
  version: number
): PersistedStoreState | Record<string, unknown> {
  if (version === 6) {
    const state = (persistedState ?? {}) as PersistedStoreState;
    const projectionGroups = normalizeProjectionGroups(state.projectionGroups ?? []);
    return {
      ...state,
      leagues: (state.leagues ?? []).map(normalizeLeague),
      projectionGroups,
      activeProjectionGroupId:
        state.activeProjectionGroupId ?? getProjectionGroupFallbackId(projectionGroups),
    };
  }

  if (version === 7) {
    const state = (persistedState ?? {}) as PersistedStoreState;
    const projectionGroups = normalizeProjectionGroups(state.projectionGroups ?? []);
    return {
      ...state,
      leagues: (state.leagues ?? []).map(normalizeLeague),
      projectionGroups,
      activeProjectionGroupId:
        state.activeProjectionGroupId ?? getProjectionGroupFallbackId(projectionGroups),
    };
  }

  if (version >= 8) {
    const state = (persistedState ?? {}) as PersistedStoreState;
    return {
      ...state,
      leagues: (state.leagues ?? []).map(normalizeLeague),
      projectionGroups: normalizeProjectionGroups(state.projectionGroups ?? []),
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
    id: crypto.randomUUID(),
    name: "My League",
    scoringSettings,
    leagueSettings,
    draftState,
    updatedAt: Date.now(),
  };

  return {
    leagues: [league],
    activeLeagueId: league.id,
    projectionGroups: normalizeProjectionGroups(state.projectionGroups ?? []),
    activeProjectionGroupId:
      state.activeProjectionGroupId ??
      getProjectionGroupFallbackId(normalizeProjectionGroups(state.projectionGroups ?? [])),
    isDraftMode: state.isDraftMode ?? false,
    mergeTwoWayRankings: state.mergeTwoWayRankings ?? true,
  };
}
