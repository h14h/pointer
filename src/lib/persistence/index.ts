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
// Split localStorage adapter
// ---------------------------------------------------------------------------
// Stores leagues, projections, and preferences in separate localStorage keys
// so users can manually delete projections without losing league config.
// Transparently migrates from the legacy single-key format ("pointer-storage").
// ---------------------------------------------------------------------------

export const splitStorage: StateStorage = {
  getItem(name: string): string | null {
    const storage = getStorage();
    if (!storage) return null;

    // Migration path: if legacy single-key data exists, return it as-is so
    // Zustand's built-in migrate() processes it. On the next setItem() call
    // the data will be written to split keys and the legacy key removed.
    const legacy = storage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      return legacy;
    }

    // Read from split keys
    const leaguesRaw = storage.getItem(STORAGE_KEY_LEAGUES);
    const projectionsRaw = storage.getItem(STORAGE_KEY_PROJECTIONS);
    const preferencesRaw = storage.getItem(STORAGE_KEY_PREFERENCES);

    if (!leaguesRaw && !projectionsRaw && !preferencesRaw) return null;

    try {
      const leagues = leaguesRaw ? JSON.parse(leaguesRaw) : {};
      const projections = projectionsRaw ? JSON.parse(projectionsRaw) : {};
      const preferences = preferencesRaw ? JSON.parse(preferencesRaw) : {};

      return JSON.stringify({
        state: { ...leagues, ...projections, ...preferences },
        version: preferences._version ?? 8,
      });
    } catch {
      return null;
    }
  },

  setItem(_name: string, value: string): void {
    const storage = getStorage();
    if (!storage) return;

    try {
      const { state, version } = JSON.parse(value);

      storage.setItem(
        STORAGE_KEY_LEAGUES,
        JSON.stringify({
          leagues: state.leagues,
          activeLeagueId: state.activeLeagueId,
        })
      );

      storage.setItem(
        STORAGE_KEY_PROJECTIONS,
        JSON.stringify({
          projectionGroups: state.projectionGroups,
          activeProjectionGroupId: state.activeProjectionGroupId,
        })
      );

      storage.setItem(
        STORAGE_KEY_PREFERENCES,
        JSON.stringify({
          isDraftMode: state.isDraftMode,
          mergeTwoWayRankings: state.mergeTwoWayRankings,
          _version: version,
        })
      );

      // Remove legacy key after successful split write
      storage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // If splitting fails, fall back to single-key write so data isn't lost
      try {
        storage.setItem(LEGACY_STORAGE_KEY, value);
      } catch { /* storage full or unavailable */ }
    }
  },

  removeItem(_name: string): void {
    const storage = getStorage();
    if (!storage) return;

    storage.removeItem(STORAGE_KEY_LEAGUES);
    storage.removeItem(STORAGE_KEY_PROJECTIONS);
    storage.removeItem(STORAGE_KEY_PREFERENCES);
    storage.removeItem(LEGACY_STORAGE_KEY);
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
