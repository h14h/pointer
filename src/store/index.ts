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
  League,
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

const createDefaultLeague = (name = "My League"): League => ({
  id: crypto.randomUUID(),
  name,
  scoringSettings: { ...defaultScoringSettings },
  leagueSettings: { ...defaultLeagueSettings },
  draftState: {
    draftedByTeam: {},
    keeperByTeam: {},
    activeTeamIndex: 0,
  },
  updatedAt: Date.now(),
});

const normalizeLeague = (league: League): League => ({
  ...league,
  leagueSettings: normalizeLeagueSettings(league.leagueSettings),
  updatedAt: league.updatedAt ?? Date.now(),
});

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
  leagues: League[];
  activeLeagueId: string | null;
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  isDraftMode: boolean;
  mergeTwoWayRankings: boolean;

  // League actions
  createLeague: (name?: string) => void;
  deleteLeague: (id: string) => void;
  duplicateLeague: (id: string) => void;
  renameLeague: (id: string, name: string) => void;
  setActiveLeague: (id: string) => void;
  updateActiveLeague: (partial: Partial<Pick<League, "scoringSettings" | "leagueSettings">>) => void;

  // Projection actions
  addProjectionGroup: (group: ProjectionGroup) => void;
  setActiveProjectionGroup: (id: string) => void;
  clearProjectionGroups: () => void;
  removeProjectionGroup: (id: string) => void;

  // Scoring actions (operate on active league)
  setScoringSettings: (settings: ScoringSettings) => void;
  updateBattingScoring: (key: keyof ScoringSettings["batting"], value: number) => void;
  updatePitchingScoring: (key: keyof ScoringSettings["pitching"], value: number) => void;

  // League settings actions (operate on active league)
  setLeagueSettings: (settings: LeagueSettings) => void;
  setLeagueSize: (size: number) => void;
  setTeamName: (index: number, name: string) => void;
  setRosterSettings: (roster: RosterSettings) => void;

  // Draft actions (operate on active league)
  setActiveTeamIndex: (index: number) => void;
  advanceActiveTeam: () => void;
  toggleDraftedForTeam: (playerId: string, teamIndex: number) => void;
  toggleKeeperForTeam: (playerId: string, teamIndex: number) => void;

  // Mode & data
  setDraftMode: (enabled: boolean) => void;
  setMergeTwoWayRankings: (enabled: boolean) => void;
  resetDraft: () => void;
  clearAllData: () => void;
  applyEligibilityForGroup: (
    groupId: string,
    eligibilityById: Map<string, Eligibility>,
    season: number
  ) => void;

  // Selectors
  getActiveLeague: () => League | undefined;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Initial state
      leagues: [createDefaultLeague()],
      activeLeagueId: null,
      projectionGroups: [],
      activeProjectionGroupId: null,
      isDraftMode: false,
      mergeTwoWayRankings: true,

      // Helpers
      getActiveLeague: () => {
        const state = get();
        const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
        return state.leagues.find((l) => l.id === activeId);
      },

      // League actions
      createLeague: (name) =>
        set((state) => {
          const newLeague = createDefaultLeague(name);
          return {
            leagues: [...state.leagues, newLeague],
            activeLeagueId: newLeague.id,
          };
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
            id: crypto.randomUUID(),
            name: `Copy of ${source.name}`,
            draftState: {
              draftedByTeam: {},
              keeperByTeam: {},
              activeTeamIndex: 0,
            },
            updatedAt: Date.now(),
          };
          return {
            leagues: [...state.leagues, newLeague],
            activeLeagueId: newLeague.id,
          };
        }),

      renameLeague: (id, name) =>
        set((state) => ({
          leagues: state.leagues.map((l) =>
            l.id === id ? { ...l, name: name.trim() || l.name, updatedAt: Date.now() } : l
          ),
        })),

      setActiveLeague: (id) => set({ activeLeagueId: id }),

      updateActiveLeague: (partial) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) =>
              l.id === activeId
                ? normalizeLeague({
                    ...l,
                    ...partial,
                    scoringSettings: partial.scoringSettings ?? l.scoringSettings,
                    leagueSettings: partial.leagueSettings ?? l.leagueSettings,
                    updatedAt: Date.now(),
                  })
                : l
            ),
          };
        }),

      // Projection actions
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

      // Scoring actions (operate on active league)
      setScoringSettings: (settings) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) =>
              l.id === activeId ? { ...l, scoringSettings: settings, updatedAt: Date.now() } : l
            ),
          };
        }),

      updateBattingScoring: (key, value) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) =>
              l.id === activeId
                ? {
                    ...l,
                    scoringSettings: {
                      ...l.scoringSettings,
                      batting: { ...l.scoringSettings.batting, [key]: value },
                    },
                    updatedAt: Date.now(),
                  }
                : l
            ),
          };
        }),

      updatePitchingScoring: (key, value) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) =>
              l.id === activeId
                ? {
                    ...l,
                    scoringSettings: {
                      ...l.scoringSettings,
                      pitching: { ...l.scoringSettings.pitching, [key]: value },
                    },
                    updatedAt: Date.now(),
                  }
                : l
            ),
          };
        }),

      // League settings actions (operate on active league)
      setLeagueSettings: (settings) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          const normalized = normalizeLeagueSettings(settings);
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const maxTeamIndex = normalized.leagueSize - 1;
              const draftedByTeam = Object.fromEntries(
                Object.entries(l.draftState.draftedByTeam).filter(
                  ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
                )
              );
              const keeperByTeam = Object.fromEntries(
                Object.entries(l.draftState.keeperByTeam).filter(
                  ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
                )
              );
              const activeTeamIndex = Math.min(
                Math.max(0, l.draftState.activeTeamIndex),
                maxTeamIndex
              );
              return {
                ...l,
                leagueSettings: normalized,
                draftState: { ...l.draftState, draftedByTeam, keeperByTeam, activeTeamIndex },
                updatedAt: Date.now(),
              };
            }),
          };
        }),

      setLeagueSize: (size) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const normalized = normalizeLeagueSettings({ ...l.leagueSettings, leagueSize: size });
              const maxTeamIndex = normalized.leagueSize - 1;
              const draftedByTeam = Object.fromEntries(
                Object.entries(l.draftState.draftedByTeam).filter(
                  ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
                )
              );
              const keeperByTeam = Object.fromEntries(
                Object.entries(l.draftState.keeperByTeam).filter(
                  ([, teamIndex]) => Number(teamIndex) <= maxTeamIndex
                )
              );
              const activeTeamIndex = Math.min(
                Math.max(0, l.draftState.activeTeamIndex),
                maxTeamIndex
              );
              return {
                ...l,
                leagueSettings: normalized,
                draftState: { ...l.draftState, draftedByTeam, keeperByTeam, activeTeamIndex },
                updatedAt: Date.now(),
              };
            }),
          };
        }),

      setTeamName: (index, name) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const nextNames = [...l.leagueSettings.teamNames];
              if (index < 0 || index >= nextNames.length) return l;
              nextNames[index] = name.trim().length > 0 ? name.trim() : `Team ${index + 1}`;
              return {
                ...l,
                leagueSettings: { ...l.leagueSettings, teamNames: nextNames },
                updatedAt: Date.now(),
              };
            }),
          };
        }),

      setRosterSettings: (roster) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) =>
              l.id === activeId
                ? {
                    ...l,
                    leagueSettings: normalizeLeagueSettings({
                      ...l.leagueSettings,
                      roster,
                    }),
                    updatedAt: Date.now(),
                  }
                : l
            ),
          };
        }),

      // Draft actions (operate on active league)
      setActiveTeamIndex: (index) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) =>
              l.id === activeId
                ? {
                    ...l,
                    draftState: {
                      ...l.draftState,
                      activeTeamIndex: Math.min(
                        Math.max(0, index),
                        l.leagueSettings.leagueSize - 1
                      ),
                    },
                  }
                : l
            ),
          };
        }),

      advanceActiveTeam: () =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) =>
              l.id === activeId
                ? {
                    ...l,
                    draftState: {
                      ...l.draftState,
                      activeTeamIndex:
                        l.leagueSettings.leagueSize > 0
                          ? (l.draftState.activeTeamIndex + 1) % l.leagueSettings.leagueSize
                          : 0,
                    },
                  }
                : l
            ),
          };
        }),

      toggleDraftedForTeam: (playerId, teamIndex) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const teamKey = String(teamIndex);
              const draftedByTeam = { ...l.draftState.draftedByTeam };
              const keeperByTeam = { ...l.draftState.keeperByTeam };
              const isDrafted = draftedByTeam[playerId] === teamKey;
              return {
                ...l,
                draftState: {
                  ...l.draftState,
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
          };
        }),

      toggleKeeperForTeam: (playerId, teamIndex) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const teamKey = String(teamIndex);
              const draftedByTeam = { ...l.draftState.draftedByTeam };
              const keeperByTeam = { ...l.draftState.keeperByTeam };
              const isKeeper = keeperByTeam[playerId] === teamKey;
              return {
                ...l,
                draftState: {
                  ...l.draftState,
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
          };
        }),

      setDraftMode: (enabled) => set({ isDraftMode: enabled }),
      setMergeTwoWayRankings: (enabled) => set({ mergeTwoWayRankings: enabled }),

      resetDraft: () =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) =>
              l.id === activeId
                ? {
                    ...l,
                    draftState: {
                      draftedByTeam: {},
                      keeperByTeam: {},
                      activeTeamIndex: 0,
                    },
                    updatedAt: Date.now(),
                  }
                : l
            ),
          };
        }),

      clearAllData: () =>
        set((state) => ({
          projectionGroups: [],
          activeProjectionGroupId: null,
          leagues: state.leagues.map((league) => ({
            ...league,
            draftState: {
              draftedByTeam: {},
              keeperByTeam: {},
              activeTeamIndex: 0,
            },
          })),
        })),

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
      version: 5,
      migrate: (persistedState, version) => {
        if (version >= 5) return persistedState as Store;

        type V4State = {
          scoringSettings: ScoringSettings;
          leagueSettings: LeagueSettings;
          draftState: DraftState;
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

        const state = persistedState as V4State;

        const scoringSettings = state.scoringSettings ?? defaultScoringSettings;
        const leagueSettings = state.leagueSettings
          ? normalizeLeagueSettings(state.leagueSettings)
          : defaultLeagueSettings;
        const draftState = state.draftState ?? {
          draftedByTeam: {},
          keeperByTeam: {},
          activeTeamIndex: 0,
        };

        const league: League = {
          id: crypto.randomUUID(),
          name: "My League",
          scoringSettings,
          leagueSettings,
          draftState,
          updatedAt: Date.now(),
        };

        return {
          ...state,
          leagues: [league],
          activeLeagueId: league.id,
        };
      },
    }
  )
);

export { defaultScoringSettings, defaultLeagueSettings, defaultRosterSettings };
