import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  advancePick,
  hasManualDraftActivity,
  migrateDraftState,
  removeKeeper as removeKeeperFn,
  resetDraft as resetDraftFn,
  setKeeper as setKeeperFn,
  undoLastPick as undoLastPickFn,
} from "@/lib/draft";
import {
  createDefaultDraftState,
  createDefaultLeague,
  isStructureChangeSafe,
  normalizeLeague,
  normalizeLeagueSettings,
} from "@/lib/league";
import { dexieStorage, migrate } from "@/lib/persistence";
import {
  getProjectionGroupFallbackId,
  isProtectedProjectionGroup,
  normalizeProjectionGroup,
} from "@/lib/projections";
import type {
  Eligibility,
  League,
  Player,
  ProjectionGroup,
  Sport,
} from "@/types";
import { randomUUID } from "@/lib/uuid";

// ---------------------------------------------------------------------------
// Internal helper: apply an update to the active league
// ---------------------------------------------------------------------------

type StoreState = Pick<Store, "leagues" | "activeLeagueId">;

function updateActiveLeague(
  state: StoreState,
  updater: (league: League) => Partial<League>,
): Partial<StoreState> {
  const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
  if (!activeId) return {};
  return {
    leagues: state.leagues.map((l) =>
      l.id === activeId
        ? normalizeLeague({ ...l, ...updater(l), updatedAt: Date.now() })
        : l,
    ),
  };
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface Store {
  // Data
  leagues: League[];
  activeLeagueId: string | null;
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  isDraftMode: boolean;
  mergeTwoWayRankings: boolean;
  hasHydrated: boolean;

  // League actions
  createLeague: (name?: string, sport?: Sport) => void;
  deleteLeague: (id: string) => void;
  duplicateLeague: (id: string) => void;
  renameLeague: (id: string, name: string) => void;
  setActiveLeague: (id: string) => void;
  updateLeague: (partial: Partial<Pick<League, "scoringSettings" | "leagueSettings">>) => void;

  // Projection actions
  addProjectionGroup: (group: ProjectionGroup) => void;
  seedProjectionGroup: (group: ProjectionGroup) => void;
  renameProjectionGroup: (id: string, name: string) => void;
  setProjectionGroupEligibilityImportSeason: (id: string, season: number) => void;
  setActiveProjectionGroup: (id: string) => void;
  clearProjectionGroups: () => void;
  removeProjectionGroup: (id: string) => void;

  // Draft actions (operate on active league)
  draftPlayer: (playerId: string) => void;
  undoLastPick: () => void;
  setKeeper: (playerId: string, teamIndex: number, round: number | null) => void;
  removeKeeper: (playerId: string) => void;

  // Mode & data
  setDraftMode: (enabled: boolean) => void;
  setMergeTwoWayRankings: (enabled: boolean) => void;
  resetDraft: () => void;
  clearAllData: () => void;
  applyEligibility: (
    groupId: string,
    eligibilityById: Map<string, Eligibility>,
    season: number,
  ) => void;

  // Selectors
  getActiveLeague: () => League | undefined;
  setHasHydrated: (value: boolean) => void;
}

type PersistedStoreState = Pick<
  Store,
  | "leagues"
  | "activeLeagueId"
  | "projectionGroups"
  | "activeProjectionGroupId"
  | "isDraftMode"
  | "mergeTwoWayRankings"
>;

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Initial state
      leagues: [createDefaultLeague("My League", { deterministic: true })],
      activeLeagueId: null,
      projectionGroups: [],
      activeProjectionGroupId: null,
      isDraftMode: false,
      mergeTwoWayRankings: true,
      hasHydrated: false,

      // Selectors / hydration
      getActiveLeague: () => {
        const state = get();
        const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
        const league = state.leagues.find((l) => l.id === activeId);
        return league ? normalizeLeague(league) : undefined;
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),

      // League CRUD
      createLeague: (name, sport) =>
        set((state) => {
          const newLeague = createDefaultLeague(name, { sport });
          return { leagues: [...state.leagues, newLeague], activeLeagueId: newLeague.id };
        }),

      deleteLeague: (id) =>
        set((state) => {
          if (state.leagues.length <= 1) return state;
          const leagues = state.leagues.filter((l) => l.id !== id);
          const activeLeagueId =
            state.activeLeagueId === id ? (leagues[0]?.id ?? null) : state.activeLeagueId;
          return { leagues, activeLeagueId };
        }),

      duplicateLeague: (id) =>
        set((state) => {
          const source = state.leagues.find((l) => l.id === id);
          if (!source) return state;
          const newLeague: League = {
            ...source,
            id: randomUUID(),
            name: `Copy of ${source.name}`,
            draftState: createDefaultDraftState(),
            updatedAt: Date.now(),
          };
          return { leagues: [...state.leagues, newLeague], activeLeagueId: newLeague.id };
        }),

      renameLeague: (id, name) =>
        set((state) => ({
          leagues: state.leagues.map((l) =>
            l.id === id ? { ...l, name: name.trim() || l.name, updatedAt: Date.now() } : l,
          ),
        })),

      setActiveLeague: (id) => set({ activeLeagueId: id }),

      updateLeague: (partial) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const merged = {
                ...l,
                ...partial,
                scoringSettings: partial.scoringSettings ?? l.scoringSettings,
                leagueSettings: partial.leagueSettings ?? l.leagueSettings,
                updatedAt: Date.now(),
              };
              if (partial.leagueSettings && hasManualDraftActivity(l.draftState)) {
                if (!isStructureChangeSafe(l.leagueSettings, normalizeLeagueSettings(partial.leagueSettings))) {
                  return l;
                }
              }
              return normalizeLeague(merged);
            }),
          };
        }),

      // Projection actions
      addProjectionGroup: (group) =>
        set((state) => ({
          projectionGroups: [...state.projectionGroups, normalizeProjectionGroup(group)],
          activeProjectionGroupId: group.id,
        })),

      seedProjectionGroup: (group) =>
        set((state) => {
          const normalized = normalizeProjectionGroup(group);
          const exists = state.projectionGroups.find((current) => {
            if (current.id === normalized.id) return true;
            return (
              current.source.kind === "public-dataset" &&
              normalized.source.kind === "public-dataset" &&
              current.source.slug === normalized.source.slug
            );
          });
          if (exists) return state;
          const projectionGroups = [...state.projectionGroups, normalized];
          return {
            projectionGroups,
            activeProjectionGroupId:
              state.activeProjectionGroupId ?? getProjectionGroupFallbackId(projectionGroups),
          };
        }),

      renameProjectionGroup: (id, name) =>
        set((state) => ({
          projectionGroups: state.projectionGroups.map((group) => {
            if (group.id !== id) return group;
            if (isProtectedProjectionGroup(group)) return group;
            const trimmedName = name.trim();
            if (trimmedName.length === 0) return group;
            return { ...group, name: trimmedName };
          }),
        })),

      setProjectionGroupEligibilityImportSeason: (id, season) =>
        set((state) => ({
          projectionGroups: state.projectionGroups.map((group) => {
            if (group.id !== id) return group;
            if (!Number.isFinite(season) || season <= 0) return group;
            return { ...group, eligibilityImportSeason: Math.round(season) };
          }),
        })),

      setActiveProjectionGroup: (id) => set({ activeProjectionGroupId: id }),

      clearProjectionGroups: () =>
        set((state) => {
          const projectionGroups = state.projectionGroups.filter(isProtectedProjectionGroup);
          return {
            projectionGroups,
            activeProjectionGroupId: getProjectionGroupFallbackId(projectionGroups),
          };
        }),

      removeProjectionGroup: (id) =>
        set((state) => {
          const target = state.projectionGroups.find((group) => group.id === id);
          if (target && isProtectedProjectionGroup(target)) return state;
          const projectionGroups = state.projectionGroups.filter((g) => g.id !== id);
          const activeProjectionGroupId =
            state.activeProjectionGroupId === id
              ? getProjectionGroupFallbackId(projectionGroups)
              : state.activeProjectionGroupId;
          return { projectionGroups, activeProjectionGroupId };
        }),

      // Draft actions
      draftPlayer: (playerId) =>
        set((state) =>
          updateActiveLeague(state, (league) => ({
            draftState: advancePick(
              migrateDraftState(league.draftState),
              playerId,
              league.leagueSettings.leagueSize,
              league.draftState.format,
            ),
          })),
        ),

      undoLastPick: () =>
        set((state) =>
          updateActiveLeague(state, (league) => ({
            draftState: undoLastPickFn(migrateDraftState(league.draftState)),
          })),
        ),

      setKeeper: (playerId, teamIndex, round) =>
        set((state) =>
          updateActiveLeague(state, (league) => ({
            draftState: setKeeperFn(
              migrateDraftState(league.draftState),
              playerId,
              teamIndex,
              round,
              league.leagueSettings.leagueSize,
              league.draftState.format,
            ),
          })),
        ),

      removeKeeper: (playerId) =>
        set((state) =>
          updateActiveLeague(state, (league) => ({
            draftState: removeKeeperFn(
              migrateDraftState(league.draftState),
              playerId,
              league.leagueSettings.leagueSize,
              league.draftState.format,
            ),
          })),
        ),

      // Mode & data
      setDraftMode: (enabled) =>
        set((state) => {
          if (!enabled) return { isDraftMode: false };
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return { isDraftMode: true };
          // Normalize draft state on mode entry to migrate any legacy shape
          return {
            isDraftMode: true,
            ...updateActiveLeague(state, (league) => ({
              draftState: migrateDraftState(league.draftState),
            })),
          };
        }),

      setMergeTwoWayRankings: (enabled) => set({ mergeTwoWayRankings: enabled }),

      resetDraft: () =>
        set((state) =>
          updateActiveLeague(state, (league) => ({
            draftState: resetDraftFn(
              migrateDraftState(league.draftState),
              league.leagueSettings.leagueSize,
              league.draftState.format,
            ),
          })),
        ),

      clearAllData: () =>
        set((state) => ({
          projectionGroups: state.projectionGroups.filter(isProtectedProjectionGroup),
          activeProjectionGroupId: getProjectionGroupFallbackId(
            state.projectionGroups.filter(isProtectedProjectionGroup),
          ),
          leagues: state.leagues.map((league) => ({
            ...league,
            draftState: createDefaultDraftState(),
          })),
        })),

      applyEligibility: (groupId, eligibilityById, season) =>
        set((state) => ({
          projectionGroups: state.projectionGroups.map((group) => {
            if (group.id !== groupId) return group;

            const applyToPlayer = (player: Player): Player => {
              const eligibility = eligibilityById.get(player._id);
              if (!eligibility) return player;
              return { ...player, eligibility };
            };

            return {
              ...group,
              batters: group.batters.map(applyToPlayer),
              pitchers: group.pitchers.map(applyToPlayer),
              twoWayPlayers: group.twoWayPlayers.map((player) => {
                const eligibility = eligibilityById.get(player._id);
                if (!eligibility) return player;
                return { ...player, eligibility };
              }),
              eligibilityImportedAt: new Date().toISOString(),
              eligibilitySeason: season,
            };
          }),
        })),
    }),
    {
      name: "pointer-storage",
      storage: createJSONStorage(() => dexieStorage),
      version: 9,
      skipHydration: true,
      partialize: (state): PersistedStoreState => ({
        leagues: state.leagues,
        activeLeagueId: state.activeLeagueId,
        projectionGroups: state.projectionGroups,
        activeProjectionGroupId: state.activeProjectionGroupId,
        isDraftMode: state.isDraftMode,
        mergeTwoWayRankings: state.mergeTwoWayRankings,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error) {
          state?.setHasHydrated(true);
        }
      },
      migrate: (persistedState, version) => migrate(persistedState, version),
    },
  ),
);

// Re-export migrateDraftState for tests that import it from @/store
export { migrateDraftState } from "@/lib/draft";
export { createDefaultDraftState, defaultScoringSettings, defaultLeagueSettings, defaultRosterSettings } from "@/lib/league";
export type { PersistedStoreState };

// Dev-only: expose store for agent-executable BDD seeding
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as Record<string, unknown>).__pointerStore = useStore;
}
