import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Player,
  ScoringSettings,
  DraftState,
  TwoWayPlayer,
  ProjectionGroup,
  IdSource,
  Eligibility,
} from "@/types";

// Default ESPN-style scoring
const defaultScoringSettings: ScoringSettings = {
  name: "Default",
  batting: {
    R: 1,
    H: 0,       // Usually score by hit type instead
    "1B": 1,
    "2B": 2,
    "3B": 3,
    HR: 4,
    RBI: 1,
    SB: 1,
    CS: -1,
    BB: 1,
    SO: -1,
    HBP: 1,
    SF: 0,
    GDP: 0,
  },
  pitching: {
    IP: 3,      // 3 points per IP (1 per out)
    W: 5,
    L: -5,
    QS: 3,
    CG: 0,
    ShO: 0,
    SV: 5,
    BS: -3,
    HLD: 2,
    SO: 1,
    H: -1,
    ER: -2,
    HR: -1,
    BB: -1,
    HBP: -1,
  },
};

interface Store {
  // Data
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  scoringSettings: ScoringSettings;
  draftState: DraftState;
  isDraftMode: boolean;
  mergeTwoWayRankings: boolean;

  // Actions
  addProjectionGroup: (group: ProjectionGroup) => void;
  setActiveProjectionGroup: (id: string) => void;
  clearProjectionGroups: () => void;
  removeProjectionGroup: (id: string) => void;
  setScoringSettings: (settings: ScoringSettings) => void;
  updateBattingScoring: (key: keyof ScoringSettings["batting"], value: number) => void;
  updatePitchingScoring: (key: keyof ScoringSettings["pitching"], value: number) => void;
  toggleDrafted: (playerId: string) => void;
  toggleKeeper: (playerId: string) => void;
  setDraftMode: (enabled: boolean) => void;
  setMergeTwoWayRankings: (enabled: boolean) => void;
  resetDraft: () => void;
  clearAllData: () => void;
  applyEligibilityForGroup: (
    groupId: string,
    eligibilityById: Map<string, Eligibility>,
    season: number
  ) => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      // Initial state
      projectionGroups: [],
      activeProjectionGroupId: null,
      scoringSettings: defaultScoringSettings,
      draftState: {
        draftedIds: [],
        keeperIds: [],
      },
      isDraftMode: false,
      mergeTwoWayRankings: true,

      // Actions
      addProjectionGroup: (group) =>
        set((state) => ({
          projectionGroups: [...state.projectionGroups, group],
          activeProjectionGroupId: group.id,
        })),

      setActiveProjectionGroup: (id) => set({ activeProjectionGroupId: id }),

      clearProjectionGroups: () => set({ projectionGroups: [], activeProjectionGroupId: null }),

      removeProjectionGroup: (id) =>
        set((state) => {
          const projectionGroups = state.projectionGroups.filter((g) => g.id !== id);
          const activeProjectionGroupId =
            state.activeProjectionGroupId === id
              ? projectionGroups[0]?.id ?? null
              : state.activeProjectionGroupId;
          return { projectionGroups, activeProjectionGroupId };
        }),

      setScoringSettings: (settings) => set({ scoringSettings: settings }),

      updateBattingScoring: (key, value) =>
        set((state) => ({
          scoringSettings: {
            ...state.scoringSettings,
            batting: {
              ...state.scoringSettings.batting,
              [key]: value,
            },
          },
        })),

      updatePitchingScoring: (key, value) =>
        set((state) => ({
          scoringSettings: {
            ...state.scoringSettings,
            pitching: {
              ...state.scoringSettings.pitching,
              [key]: value,
            },
          },
        })),

      toggleDrafted: (playerId) =>
        set((state) => {
          const isDrafted = state.draftState.draftedIds.includes(playerId);
          return {
            draftState: {
              ...state.draftState,
              draftedIds: isDrafted
                ? state.draftState.draftedIds.filter((id) => id !== playerId)
                : [...state.draftState.draftedIds, playerId],
            },
          };
        }),

      toggleKeeper: (playerId) =>
        set((state) => {
          const isKeeper = state.draftState.keeperIds.includes(playerId);
          return {
            draftState: {
              ...state.draftState,
              keeperIds: isKeeper
                ? state.draftState.keeperIds.filter((id) => id !== playerId)
                : [...state.draftState.keeperIds, playerId],
            },
          };
        }),

      setDraftMode: (enabled) => set({ isDraftMode: enabled }),
      setMergeTwoWayRankings: (enabled) => set({ mergeTwoWayRankings: enabled }),

      resetDraft: () =>
        set({
          draftState: {
            draftedIds: [],
            keeperIds: [],
          },
        }),

      clearAllData: () =>
        set({
          projectionGroups: [],
          activeProjectionGroupId: null,
          draftState: {
            draftedIds: [],
            keeperIds: [],
          },
        }),

      applyEligibilityForGroup: (groupId, eligibilityById, season) =>
        set((state) => {
          const projectionGroups = state.projectionGroups.map((group) => {
            if (group.id !== groupId) return group;

            const applyEligibility = (player: Player): Player => {
              const eligibility = eligibilityById.get(player._id);
              if (!eligibility) return player;
              return { ...player, eligibility };
            };

            return {
              ...group,
              batters: group.batters.map(applyEligibility),
              pitchers: group.pitchers.map(applyEligibility),
              twoWayPlayers: group.twoWayPlayers.map((player) => {
                const eligibility = eligibilityById.get(player._id);
                if (!eligibility) return player;
                return { ...player, eligibility };
              }),
              eligibilityImportedAt: new Date().toISOString(),
              eligibilitySeason: season,
            };
          });

          return { projectionGroups };
        }),
    }),
    {
      name: "pointer-storage",
      version: 3,
      migrate: (persistedState, version) => {
        if (version >= 3) return persistedState as Store;
        const state = persistedState as Store & {
          batters?: Player[];
          pitchers?: Player[];
          twoWayPlayers?: TwoWayPlayer[];
          batterIdSource?: IdSource | null;
          pitcherIdSource?: IdSource | null;
        };

        const ensurePitchingScoring = (settings: ScoringSettings): ScoringSettings => ({
          ...settings,
          pitching: {
            CG: 0,
            ShO: 0,
            ...settings.pitching,
          },
        });

        if (version === 2) {
          return {
            ...state,
            scoringSettings: ensurePitchingScoring(state.scoringSettings),
          } as Store;
        }

        if (state.projectionGroups && state.activeProjectionGroupId !== undefined) {
          return {
            ...state,
            scoringSettings: ensurePitchingScoring(state.scoringSettings),
          } as Store;
        }

        const legacyBatters = state.batters ?? [];
        const legacyPitchers = state.pitchers ?? [];
        const legacyTwoWay = state.twoWayPlayers ?? [];
        const hasLegacy =
          legacyBatters.length > 0 || legacyPitchers.length > 0 || legacyTwoWay.length > 0;

        if (!hasLegacy) {
          return {
            ...state,
            projectionGroups: [],
            activeProjectionGroupId: null,
          } as Store;
        }

        const defaultGroup: ProjectionGroup = {
          id: "imported",
          name: "Imported",
          createdAt: new Date().toISOString(),
          batters: legacyBatters,
          pitchers: legacyPitchers,
          twoWayPlayers: legacyTwoWay,
          batterIdSource: state.batterIdSource ?? null,
          pitcherIdSource: state.pitcherIdSource ?? null,
        };

        return {
          ...state,
          projectionGroups: [defaultGroup],
          activeProjectionGroupId: defaultGroup.id,
          scoringSettings: ensurePitchingScoring(state.scoringSettings),
        } as Store;
      },
    }
  )
);

export { defaultScoringSettings };
