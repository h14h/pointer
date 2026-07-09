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
import { mergeIncomingCloudLeagues } from "@/lib/cloudSync";
import {
  createDefaultDraftState,
  createDefaultLeague,
  INITIAL_LEAGUE_ID,
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

function projectionGroupHasPlayers(group: ProjectionGroup): boolean {
  return group.sport === "football"
    ? (group.footballPlayers?.length ?? 0) > 0
    : group.batters.length + group.pitchers.length + group.twoWayPlayers.length > 0;
}

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
  // League ids deleted locally but possibly still in cloud storage (Pro sync
  // tombstones — cleared once the cloud copy is removed)
  deletedLeagueIds: string[];
  // First-run flag: false until the user picks a sport on the welcome screen.
  // Existing installs migrate to true so they never see onboarding.
  hasOnboarded: boolean;

  // League actions
  createLeague: (name?: string, sport?: Sport) => void;
  completeOnboarding: (sport: Sport) => void;
  switchSport: (sport: Sport) => void;
  deleteLeague: (id: string) => void;
  duplicateLeague: (id: string) => void;
  renameLeague: (id: string, name: string) => void;
  setActiveLeague: (id: string) => void;
  updateLeague: (
    partial: Partial<Pick<League, "scoringSettings" | "leagueSettings" | "football">>,
  ) => void;

  // Strategy & identity (operate on active league)
  toggleTarget: (playerId: string) => void;
  setRoundNote: (round: number, note: string) => void;
  setMyTeamIndex: (index: number) => void;
  // Per-league projection source (sport-scoped library)
  setLeagueProjectionGroup: (leagueId: string, groupId: string | null) => void;

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
  setMergeTwoWayRankings: (enabled: boolean) => void;
  resetDraft: () => void;
  clearAllData: () => void;
  applyEligibility: (
    groupId: string,
    eligibilityById: Map<string, Eligibility>,
    season: number,
  ) => void;

  // Cloud sync (Pro)
  applyCloudLeagues: (incoming: League[]) => void;
  clearDeletedLeagueIds: (ids: string[]) => void;

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
  | "deletedLeagueIds"
  | "hasOnboarded"
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
      deletedLeagueIds: [],
      hasOnboarded: false,

      // Cloud sync (Pro): merge remote leagues without bumping updatedAt so
      // last-write-wins stays stable across devices
      applyCloudLeagues: (incoming) =>
        set((state) => {
          if (incoming.length === 0) return state;
          return {
            leagues: mergeIncomingCloudLeagues({
              localLeagues: state.leagues,
              incomingLeagues: incoming,
              tombstoneLeagueIds: state.deletedLeagueIds,
            }),
          };
        }),

      clearDeletedLeagueIds: (ids) =>
        set((state) => ({
          deletedLeagueIds: state.deletedLeagueIds.filter((id) => !ids.includes(id)),
        })),

      // Selectors / hydration
      getActiveLeague: () => {
        const state = get();
        const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
        const league = state.leagues.find((l) => l.id === activeId);
        return league ? normalizeLeague(league) : undefined;
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),

      // League CRUD
      // Activate the most recently used league of the target sport, creating
      // one when the user has none — sport is a mode, leagues live within it
      switchSport: (sport) =>
        set((state) => {
          const active =
            state.leagues.find((l) => l.id === state.activeLeagueId) ?? state.leagues[0];
          if ((active?.sport ?? "baseball") === sport) return state;

          const candidates = state.leagues.filter((l) => (l.sport ?? "baseball") === sport);
          if (candidates.length > 0) {
            const mostRecent = candidates.reduce((latest, league) =>
              (league.updatedAt ?? 0) > (latest.updatedAt ?? 0) ? league : latest,
            );
            return { activeLeagueId: mostRecent.id };
          }

          const league = createDefaultLeague(
            sport === "football" ? "My Football League" : "My Baseball League",
            { sport },
          );
          return { leagues: [...state.leagues, league], activeLeagueId: league.id };
        }),

      createLeague: (name, sport) =>
        set((state) => {
          const newLeague = createDefaultLeague(name, { sport });
          return { leagues: [...state.leagues, newLeague], activeLeagueId: newLeague.id };
        }),

      completeOnboarding: (sport) =>
        set((state) => {
          const defaultName = sport === "football" ? "My Football League" : "My Baseball League";

          // Fresh install: replace the untouched placeholder league outright
          const onlyPristineDefault =
            state.leagues.length === 1 &&
            state.leagues[0].id === INITIAL_LEAGUE_ID &&
            state.leagues[0].updatedAt === 0;
          if (onlyPristineDefault) {
            const league = createDefaultLeague(defaultName, { sport });
            return { leagues: [league], activeLeagueId: league.id, hasOnboarded: true };
          }

          // Otherwise activate an existing league of that sport, or add one
          const existing = state.leagues.find((l) => (l.sport ?? "baseball") === sport);
          if (existing) {
            return { activeLeagueId: existing.id, hasOnboarded: true };
          }
          const league = createDefaultLeague(defaultName, { sport });
          return {
            leagues: [...state.leagues, league],
            activeLeagueId: league.id,
            hasOnboarded: true,
          };
        }),

      deleteLeague: (id) =>
        set((state) => {
          if (state.leagues.length <= 1) return state;
          const leagues = state.leagues.filter((l) => l.id !== id);
          const activeLeagueId =
            state.activeLeagueId === id ? (leagues[0]?.id ?? null) : state.activeLeagueId;
          return {
            leagues,
            activeLeagueId,
            deletedLeagueIds: [...new Set([...state.deletedLeagueIds, id])],
          };
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
                football: partial.football ?? l.football,
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

      // Strategy & identity
      toggleTarget: (playerId) =>
        set((state) =>
          updateActiveLeague(state, (league) => {
            const strategy = league.strategy ?? { targetIds: [], noteByRound: {} };
            const targetIds = strategy.targetIds.includes(playerId)
              ? strategy.targetIds.filter((id) => id !== playerId)
              : [...strategy.targetIds, playerId];
            return { strategy: { ...strategy, targetIds } };
          }),
        ),

      setRoundNote: (round, note) =>
        set((state) =>
          updateActiveLeague(state, (league) => {
            const strategy = league.strategy ?? { targetIds: [], noteByRound: {} };
            const noteByRound = { ...strategy.noteByRound };
            if (note.trim().length === 0) {
              delete noteByRound[String(round)];
            } else {
              noteByRound[String(round)] = note;
            }
            return { strategy: { ...strategy, noteByRound } };
          }),
        ),

      setMyTeamIndex: (index) =>
        set((state) =>
          updateActiveLeague(state, () => ({ myTeamIndex: index })),
        ),

      setLeagueProjectionGroup: (leagueId, groupId) =>
        set((state) => ({
          leagues: state.leagues.map((l) =>
            l.id === leagueId
              ? normalizeLeague({ ...l, projectionGroupId: groupId, updatedAt: Date.now() })
              : l,
          ),
        })),

      // Projection actions
      addProjectionGroup: (group) =>
        set((state) => {
          const normalized = normalizeProjectionGroup(group);
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          return {
            projectionGroups: [...state.projectionGroups, normalized],
            activeProjectionGroupId: group.id,
            // A fresh upload becomes the active league's source when sports
            // match — uploading from a league's Intel tab adopts it in place.
            leagues: state.leagues.map((l) =>
              l.id === activeId && l.sport === normalized.sport
                ? normalizeLeague({ ...l, projectionGroupId: normalized.id, updatedAt: Date.now() })
                : l,
            ),
          };
        }),

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
          if (exists) {
            if (
              exists.source.kind === "public-dataset" &&
              normalized.source.kind === "public-dataset" &&
              !projectionGroupHasPlayers(exists) &&
              projectionGroupHasPlayers(normalized)
            ) {
              const replacement = normalizeProjectionGroup({ ...normalized, id: exists.id });
              return {
                projectionGroups: state.projectionGroups.map((current) =>
                  current.id === exists.id ? replacement : current,
                ),
              };
            }
            return state;
          }
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
      version: 11,
      skipHydration: true,
      partialize: (state): PersistedStoreState => ({
        leagues: state.leagues,
        activeLeagueId: state.activeLeagueId,
        projectionGroups: state.projectionGroups,
        activeProjectionGroupId: state.activeProjectionGroupId,
        isDraftMode: state.isDraftMode,
        mergeTwoWayRankings: state.mergeTwoWayRankings,
        deletedLeagueIds: state.deletedLeagueIds,
        hasOnboarded: state.hasOnboarded,
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
