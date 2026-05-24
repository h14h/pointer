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
// Storage key constants
// ---------------------------------------------------------------------------

export const STORAGE_KEY_LEAGUES = "pointer-leagues";
export const STORAGE_KEY_PROJECTIONS = "pointer-projections";
export const STORAGE_KEY_PREFERENCES = "pointer-preferences";
export const LEGACY_STORAGE_KEY = "pointer-storage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

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

// Backward-compatible alias so existing imports don't break.
export { dexieStorage as splitStorage };

// ---------------------------------------------------------------------------
// One-time migration from localStorage
// ---------------------------------------------------------------------------

export async function migrateFromLocalStorage(): Promise<string | null> {
  const storage = getStorage();
  if (!storage) return null;

  // 1. Check if Dexie already has data — don't overwrite
  const existingDexie = await dexieStorage.getItem(LEGACY_STORAGE_KEY);
  if (existingDexie) {
    // Clean up localStorage anyway since Dexie is the source of truth
    storage.removeItem(LEGACY_STORAGE_KEY);
    storage.removeItem(STORAGE_KEY_LEAGUES);
    storage.removeItem(STORAGE_KEY_PROJECTIONS);
    storage.removeItem(STORAGE_KEY_PREFERENCES);
    return null;
  }

  // 2. Check legacy single-key format
  const legacy = storage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    await dexieStorage.setItem(LEGACY_STORAGE_KEY, legacy);
    storage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }

  // 3. Check split keys
  const leaguesRaw = storage.getItem(STORAGE_KEY_LEAGUES);
  const projectionsRaw = storage.getItem(STORAGE_KEY_PROJECTIONS);
  const preferencesRaw = storage.getItem(STORAGE_KEY_PREFERENCES);

  if (!leaguesRaw && !projectionsRaw && !preferencesRaw) {
    return null;
  }

  try {
    const leagues = leaguesRaw ? JSON.parse(leaguesRaw) : {};
    const projections = projectionsRaw ? JSON.parse(projectionsRaw) : {};
    const preferences = preferencesRaw ? JSON.parse(preferencesRaw) : {};

    const blob = JSON.stringify({
      state: { ...leagues, ...projections, ...preferences },
      version: preferences._version ?? 8,
    });

    await dexieStorage.setItem(LEGACY_STORAGE_KEY, blob);

    // Clean up localStorage after successful migration
    storage.removeItem(STORAGE_KEY_LEAGUES);
    storage.removeItem(STORAGE_KEY_PROJECTIONS);
    storage.removeItem(STORAGE_KEY_PREFERENCES);
    storage.removeItem(LEGACY_STORAGE_KEY);

    return blob;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Async hydration helper
// ---------------------------------------------------------------------------

export async function hydrateFromDexie(): Promise<
  { state: unknown; version: number } | null
> {
  // 1. Try Dexie first
  const dexieRaw = await dexieStorage.getItem(LEGACY_STORAGE_KEY);
  if (dexieRaw) {
    try {
      const parsed = JSON.parse(dexieRaw);
      return { state: parsed.state, version: parsed.version ?? 8 };
    } catch {
      // fall through
    }
  }

  // 2. Fall back to localStorage migration
  const migratedRaw = await migrateFromLocalStorage();
  if (migratedRaw) {
    try {
      const parsed = JSON.parse(migratedRaw);
      return { state: parsed.state, version: parsed.version ?? 8 };
    } catch {
      return null;
    }
  }

  return null;
}

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
