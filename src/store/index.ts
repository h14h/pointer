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
  LeagueSettings,
  RosterSettings,
  RosterSlot,
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

const defaultRosterSettings: RosterSettings = {
  positions: {
    C: 1,
    "1B": 1,
    "2B": 1,
    "3B": 1,
    SS: 1,
    LF: 0,
    CF: 0,
    RF: 0,
    DH: 0,
    CI: 0,
    MI: 0,
    IF: 0,
    OF: 3,
    UTIL: 1,
    SP: 0,
    RP: 0,
    P: 7,
    IL: 0,
    NA: 0,
  },
  bench: 3,
};

const defaultLeagueSettings: LeagueSettings = {
  leagueSize: 12,
  teamNames: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
  roster: defaultRosterSettings,
};

const normalizeLeagueSettings = (settings: LeagueSettings): LeagueSettings => {
  const clampedSize = Math.min(20, Math.max(2, Math.round(settings.leagueSize || 0)));
  const nextNames = [...(settings.teamNames ?? [])];
  const roster = settings.roster ?? defaultRosterSettings;
  for (let i = nextNames.length; i < clampedSize; i += 1) {
    nextNames.push(`Team ${i + 1}`);
  }
  if (nextNames.length > clampedSize) {
    nextNames.length = clampedSize;
  }
  const positions = Object.fromEntries(
    Object.entries(defaultRosterSettings.positions).map(([slot, value]) => [
      slot,
      roster.positions[slot as RosterSlot] ?? value,
    ])
  ) as Record<RosterSlot, number>;

  return {
    leagueSize: clampedSize,
    teamNames: nextNames,
    roster: {
      positions,
      bench: Number.isFinite(roster.bench) ? roster.bench : defaultRosterSettings.bench,
    },
  };
};

interface Store {
  // Data
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  scoringSettings: ScoringSettings;
  leagueSettings: LeagueSettings;
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
  setLeagueSettings: (settings: LeagueSettings) => void;
  setLeagueSize: (size: number) => void;
  setTeamName: (index: number, name: string) => void;
  setRosterSettings: (roster: RosterSettings) => void;
  setActiveTeamIndex: (index: number) => void;
  advanceActiveTeam: () => void;
  toggleDraftedForTeam: (playerId: string, teamIndex: number) => void;
  toggleKeeperForTeam: (playerId: string, teamIndex: number) => void;
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
      leagueSettings: defaultLeagueSettings,
      draftState: {
        draftedByTeam: {},
        keeperByTeam: {},
        activeTeamIndex: 0,
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

      setLeagueSettings: (settings) =>
        set((state) => {
          const normalized = normalizeLeagueSettings(settings);
          const maxTeamIndex = normalized.leagueSize - 1;
          const draftedByTeam = Object.fromEntries(
            Object.entries(state.draftState.draftedByTeam).filter(
              ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
            )
          );
          const keeperByTeam = Object.fromEntries(
            Object.entries(state.draftState.keeperByTeam).filter(
              ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
            )
          );
          const activeTeamIndex = Math.min(
            Math.max(0, state.draftState.activeTeamIndex),
            maxTeamIndex
          );

          return {
            leagueSettings: normalized,
            draftState: {
              ...state.draftState,
              draftedByTeam,
              keeperByTeam,
              activeTeamIndex,
            },
          };
        }),

      setLeagueSize: (size) =>
        set((state) => {
          const normalized = normalizeLeagueSettings({
            ...state.leagueSettings,
            leagueSize: size,
          });
          const maxTeamIndex = normalized.leagueSize - 1;
          const draftedByTeam = Object.fromEntries(
            Object.entries(state.draftState.draftedByTeam).filter(
              ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
            )
          );
          const keeperByTeam = Object.fromEntries(
            Object.entries(state.draftState.keeperByTeam).filter(
              ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
            )
          );
          const activeTeamIndex = Math.min(
            Math.max(0, state.draftState.activeTeamIndex),
            maxTeamIndex
          );

          return {
            leagueSettings: normalized,
            draftState: {
              ...state.draftState,
              draftedByTeam,
              keeperByTeam,
              activeTeamIndex,
            },
          };
        }),

      setTeamName: (index, name) =>
        set((state) => {
          const nextNames = [...state.leagueSettings.teamNames];
          if (index < 0 || index >= nextNames.length) return state;
          nextNames[index] = name.trim().length > 0 ? name.trim() : `Team ${index + 1}`;
          return {
            leagueSettings: {
              ...state.leagueSettings,
              teamNames: nextNames,
            },
          };
        }),

      setRosterSettings: (roster) =>
        set((state) => ({
          leagueSettings: normalizeLeagueSettings({
            ...state.leagueSettings,
            roster,
          }),
        })),

      setActiveTeamIndex: (index) =>
        set((state) => ({
          draftState: {
            ...state.draftState,
            activeTeamIndex: Math.min(
              Math.max(0, index),
              state.leagueSettings.leagueSize - 1
            ),
          },
        })),

      advanceActiveTeam: () =>
        set((state) => ({
          draftState: {
            ...state.draftState,
            activeTeamIndex:
              state.leagueSettings.leagueSize > 0
                ? (state.draftState.activeTeamIndex + 1) %
                  state.leagueSettings.leagueSize
                : 0,
          },
        })),

      toggleDraftedForTeam: (playerId, teamIndex) =>
        set((state) => {
          const teamKey = String(teamIndex);
          const draftedByTeam = { ...state.draftState.draftedByTeam };
          const keeperByTeam = { ...state.draftState.keeperByTeam };
          const isDrafted = draftedByTeam[playerId] === teamKey;
          return {
            draftState: {
              ...state.draftState,
              draftedByTeam: isDrafted
                ? Object.fromEntries(
                    Object.entries(draftedByTeam).filter(([id]) => id !== playerId)
                  )
                : { ...draftedByTeam, [playerId]: teamKey },
              keeperByTeam: isDrafted
                ? keeperByTeam
                : Object.fromEntries(
                    Object.entries(keeperByTeam).filter(([id]) => id !== playerId)
                  ),
            },
          };
        }),

      toggleKeeperForTeam: (playerId, teamIndex) =>
        set((state) => {
          const teamKey = String(teamIndex);
          const draftedByTeam = { ...state.draftState.draftedByTeam };
          const keeperByTeam = { ...state.draftState.keeperByTeam };
          const isKeeper = keeperByTeam[playerId] === teamKey;
          return {
            draftState: {
              ...state.draftState,
              keeperByTeam: isKeeper
                ? Object.fromEntries(
                    Object.entries(keeperByTeam).filter(([id]) => id !== playerId)
                  )
                : { ...keeperByTeam, [playerId]: teamKey },
              draftedByTeam: isKeeper
                ? draftedByTeam
                : Object.fromEntries(
                    Object.entries(draftedByTeam).filter(([id]) => id !== playerId)
                  ),
            },
          };
        }),

      setDraftMode: (enabled) => set({ isDraftMode: enabled }),
      setMergeTwoWayRankings: (enabled) => set({ mergeTwoWayRankings: enabled }),

      resetDraft: () =>
        set({
          draftState: {
            draftedByTeam: {},
            keeperByTeam: {},
            activeTeamIndex: 0,
          },
        }),

      clearAllData: () =>
        set({
          projectionGroups: [],
          activeProjectionGroupId: null,
          draftState: {
            draftedByTeam: {},
            keeperByTeam: {},
            activeTeamIndex: 0,
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
      version: 4,
      migrate: (persistedState, version) => {
        if (version >= 4) return persistedState as Store;
        const state = persistedState as (Store & {
          batters?: Player[];
          pitchers?: Player[];
          twoWayPlayers?: TwoWayPlayer[];
          batterIdSource?: IdSource | null;
          pitcherIdSource?: IdSource | null;
          leagueSettings?: LeagueSettings;
          draftState?: DraftState & {
            draftedIds?: string[];
            keeperIds?: string[];
          };
        });

        const ensurePitchingScoring = (settings: ScoringSettings): ScoringSettings => ({
          ...settings,
          pitching: {
            CG: 0,
            ShO: 0,
            ...settings.pitching,
          },
        });

        const ensureLeagueAndDraft = (inputState: Store): Store => {
          const leagueSettings = inputState.leagueSettings
            ? normalizeLeagueSettings(inputState.leagueSettings)
            : defaultLeagueSettings;

          const legacyDrafted = (state.draftState as DraftState | undefined)?.draftedByTeam;
          const legacyKeepers = (state.draftState as DraftState | undefined)?.keeperByTeam;
          const legacyDraftedIds = state.draftState?.draftedIds ?? [];
          const legacyKeeperIds = state.draftState?.keeperIds ?? [];

          let draftedByTeam = legacyDrafted ?? {};
          let keeperByTeam = legacyKeepers ?? {};

          if (legacyDraftedIds.length > 0 || legacyKeeperIds.length > 0) {
            const teamKey = "0";
            draftedByTeam = Object.fromEntries(legacyDraftedIds.map((id) => [id, teamKey]));
            keeperByTeam = Object.fromEntries(legacyKeeperIds.map((id) => [id, teamKey]));
          }

          const maxTeamIndex = leagueSettings.leagueSize - 1;
          draftedByTeam = Object.fromEntries(
            Object.entries(draftedByTeam).filter(
              ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
            )
          );
          keeperByTeam = Object.fromEntries(
            Object.entries(keeperByTeam).filter(
              ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
            )
          );

          return {
            ...inputState,
            leagueSettings,
            draftState: {
              draftedByTeam,
              keeperByTeam,
              activeTeamIndex: Math.min(
                Math.max(0, inputState.draftState?.activeTeamIndex ?? 0),
                maxTeamIndex
              ),
            },
          };
        };

        if (version === 2) {
          const nextState = {
            ...state,
            scoringSettings: ensurePitchingScoring(state.scoringSettings),
          } as Store;
          return ensureLeagueAndDraft(nextState);
        }

        if (state.projectionGroups && state.activeProjectionGroupId !== undefined) {
          const nextState = {
            ...state,
            scoringSettings: ensurePitchingScoring(state.scoringSettings),
          } as Store;
          return ensureLeagueAndDraft(nextState);
        }

        const legacyBatters = state.batters ?? [];
        const legacyPitchers = state.pitchers ?? [];
        const legacyTwoWay = state.twoWayPlayers ?? [];
        const hasLegacy =
          legacyBatters.length > 0 || legacyPitchers.length > 0 || legacyTwoWay.length > 0;

        if (!hasLegacy) {
          const nextState = {
            ...state,
            projectionGroups: [],
            activeProjectionGroupId: null,
          } as Store;
          return ensureLeagueAndDraft(nextState);
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

        const nextState = {
          ...state,
          projectionGroups: [defaultGroup],
          activeProjectionGroupId: defaultGroup.id,
          scoringSettings: ensurePitchingScoring(state.scoringSettings),
        } as Store;
        return ensureLeagueAndDraft(nextState);
      },
    }
  )
);

export { defaultScoringSettings, defaultLeagueSettings, defaultRosterSettings };
