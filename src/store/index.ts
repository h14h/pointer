import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createDraftPick,
  getDraftPickContext,
  getNextOpenPickIndex,
  getPickIndexForTeamRound,
  hasDraftActivity,
} from "@/lib/draft";
import type {
  Player,
  ScoringSettings,
  DraftState,
  DraftPick,
  DraftFormat,
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
  weeklyStartLimit: null,
};

const createDefaultDraftState = (): DraftState => ({
  format: "snake",
  draftedByTeam: {},
  keeperByTeam: {},
  keeperSlotByPlayer: {},
  pickIndex: 0,
  history: [],
});

const createDefaultLeague = (name = "My League"): League => ({
  id: crypto.randomUUID(),
  name,
  scoringSettings: { ...defaultScoringSettings },
  leagueSettings: { ...defaultLeagueSettings },
  draftState: createDefaultDraftState(),
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
    weeklyStartLimit:
      Number.isFinite(settings.weeklyStartLimit) && (settings.weeklyStartLimit ?? 0) > 0
        ? Math.round(settings.weeklyStartLimit as number)
        : null,
  };
};

function areSameStringMultiset(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const counts = new Map<string, number>();
  for (const value of left) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  for (const value of right) {
    const count = counts.get(value);
    if (!count) return false;
    if (count === 1) {
      counts.delete(value);
    } else {
      counts.set(value, count - 1);
    }
  }
  return counts.size === 0;
}

function isBlockedDraftStructureChange(previous: LeagueSettings, next: LeagueSettings): boolean {
  if (previous.leagueSize !== next.leagueSize) return true;
  if (previous.teamNames.length !== next.teamNames.length) return true;
  const sameOrder = previous.teamNames.every((teamName, index) => teamName === next.teamNames[index]);
  if (sameOrder) return false;
  return areSameStringMultiset(previous.teamNames, next.teamNames);
}

function getDraftCursorBase(state: DraftState): number {
  const lastPick = state.history.at(-1);
  if (lastPick) return lastPick.slotIndex + 1;
  const hasKnownManualProgress = Object.keys(state.draftedByTeam).some(
    (playerId) => state.keeperByTeam[playerId] === undefined
  );
  return hasKnownManualProgress ? state.pickIndex : 0;
}

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
  startDraft: () => void;
  draftPlayer: (playerId: string) => void;
  undoLastDraftPick: () => void;
  setKeeperForTeam: (playerId: string, teamIndex: number, round: number | null) => void;
  removeKeeper: (playerId: string) => void;

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
  canEditDraftSetup: () => boolean;
  getCurrentPickContext: () => {
    overallPick: number;
    round: number;
    pickInRound: number;
    teamIndex: number;
    nextTeamIndex: number;
  } | null;
}

type LegacyDraftState = {
  draftedByTeam?: Record<string, string>;
  keeperByTeam?: Record<string, string>;
  keeperSlotByPlayer?: Record<string, number | null>;
  activeTeamIndex?: number;
  format?: DraftFormat;
  pickIndex?: number;
  history?: DraftPick[];
};

export function migrateDraftState(input?: LegacyDraftState | null): DraftState {
  const draftedByTeam = { ...(input?.draftedByTeam ?? {}) };
  const keeperByTeam = { ...(input?.keeperByTeam ?? {}) };
  const keeperSlotByPlayer = { ...(input?.keeperSlotByPlayer ?? {}) };
  const history = Array.isArray(input?.history) ? input.history : [];
  const fallbackPickIndex = Object.keys(draftedByTeam).filter(
    (playerId) => keeperByTeam[playerId] === undefined
  ).length;
  const pickIndex = history.length > 0
    ? history.length
    : Number.isFinite(input?.pickIndex)
      ? Math.max(0, Math.round(input?.pickIndex as number))
      : fallbackPickIndex;

  return {
    format: input?.format ?? "snake",
    draftedByTeam,
    keeperByTeam,
    keeperSlotByPlayer,
    pickIndex: history.length > 0 ? history.length : pickIndex,
    history,
  };
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
      canEditDraftSetup: () => {
        const activeLeague = get().getActiveLeague();
        return activeLeague ? !hasDraftActivity(activeLeague.draftState) : true;
      },
      getCurrentPickContext: () => {
        const activeLeague = get().getActiveLeague();
        if (!activeLeague) return null;
        const nextOpenPickIndex = getNextOpenPickIndex(
          activeLeague.leagueSettings.leagueSize,
          getDraftCursorBase(activeLeague.draftState),
          activeLeague.draftState.format,
          activeLeague.draftState
        );
        return getDraftPickContext(
          activeLeague.leagueSettings.leagueSize,
          nextOpenPickIndex,
          activeLeague.draftState.format
        );
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
            draftState: createDefaultDraftState(),
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
              if (
                hasDraftActivity(l.draftState) &&
                isBlockedDraftStructureChange(l.leagueSettings, normalized)
              ) {
                return l;
              }
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
              return {
                ...l,
                leagueSettings: normalized,
                draftState: { ...l.draftState, draftedByTeam, keeperByTeam },
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
              if (hasDraftActivity(l.draftState)) return l;
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
              return {
                ...l,
                leagueSettings: normalized,
                draftState: { ...l.draftState, draftedByTeam, keeperByTeam },
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
      startDraft: () =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              return {
                ...l,
                draftState: (() => {
                  const draftState = migrateDraftState(l.draftState);
                  return {
                    ...draftState,
                    pickIndex: getNextOpenPickIndex(
                      l.leagueSettings.leagueSize,
                      getDraftCursorBase(draftState),
                      draftState.format,
                      draftState
                    ),
                  };
                })(),
                updatedAt: Date.now(),
              };
            }),
          };
        }),

      draftPlayer: (playerId) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const draftState = migrateDraftState(l.draftState);
              if (draftState.draftedByTeam[playerId] !== undefined) return l;
              if (draftState.keeperByTeam[playerId] !== undefined) return l;
              const openPickIndex = getNextOpenPickIndex(
                l.leagueSettings.leagueSize,
                draftState.pickIndex,
                draftState.format,
                draftState
              );
              const context = getDraftPickContext(
                l.leagueSettings.leagueSize,
                openPickIndex,
                draftState.format
              );
              const teamKey = String(context.teamIndex);
              const draftedByTeam = { ...l.draftState.draftedByTeam };
              draftedByTeam[playerId] = teamKey;
              const nextPick = createDraftPick(playerId, context.teamIndex, openPickIndex, context);
              const nextDraftState = {
                ...draftState,
                draftedByTeam,
                pickIndex: getNextOpenPickIndex(
                  l.leagueSettings.leagueSize,
                  openPickIndex + 1,
                  draftState.format,
                  draftState
                ),
                history: [...draftState.history, nextPick],
              };
              return {
                ...l,
                draftState: nextDraftState,
                updatedAt: Date.now(),
              };
            }),
          };
        }),

      undoLastDraftPick: () =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const draftState = migrateDraftState(l.draftState);
              const lastPick = draftState.history.at(-1);
              if (!lastPick) return l;
              const draftedByTeam = { ...draftState.draftedByTeam };
              delete draftedByTeam[lastPick.playerId];
              return {
                ...l,
                draftState: {
                  ...draftState,
                  draftedByTeam,
                  pickIndex: lastPick.slotIndex,
                  history: draftState.history.slice(0, -1),
                },
                updatedAt: Date.now(),
              };
            }),
          };
        }),

      setKeeperForTeam: (playerId, teamIndex, round) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const maxIndex = l.leagueSettings.leagueSize - 1;
              const normalizedTeamIndex = Math.min(Math.max(0, teamIndex), maxIndex);
              const draftState = migrateDraftState(l.draftState);
              const reservedPickIndex =
                round === null
                  ? null
                  : getPickIndexForTeamRound(
                      l.leagueSettings.leagueSize,
                      round,
                      normalizedTeamIndex,
                      draftState.format
                    );
              if (round !== null && reservedPickIndex === null) return l;
              if (
                reservedPickIndex !== null &&
                reservedPickIndex < draftState.pickIndex
              ) {
                return l;
              }
              const existingReservationOwner = Object.entries(draftState.keeperSlotByPlayer).find(
                ([otherPlayerId, slotIndex]) =>
                  otherPlayerId !== playerId &&
                  slotIndex !== null &&
                  slotIndex === reservedPickIndex
              );
              if (reservedPickIndex !== null && existingReservationOwner) return l;
              const keeperByTeam = { ...draftState.keeperByTeam, [playerId]: String(normalizedTeamIndex) };
              const draftedByTeam = { ...draftState.draftedByTeam };
              const keeperSlotByPlayer = {
                ...draftState.keeperSlotByPlayer,
                [playerId]: reservedPickIndex,
              };
              delete draftedByTeam[playerId];
              const nextDraftState = {
                ...draftState,
                draftedByTeam,
                keeperByTeam,
                keeperSlotByPlayer,
              };
              return {
                ...l,
                draftState: {
                  ...nextDraftState,
                  pickIndex: getNextOpenPickIndex(
                    l.leagueSettings.leagueSize,
                    getDraftCursorBase(nextDraftState),
                    nextDraftState.format,
                    nextDraftState
                  ),
                },
                updatedAt: Date.now(),
              };
            }),
          };
        }),

      removeKeeper: (playerId) =>
        set((state) => {
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return state;
          return {
            leagues: state.leagues.map((l) => {
              if (l.id !== activeId) return l;
              const draftState = migrateDraftState(l.draftState);
              if (draftState.keeperByTeam[playerId] === undefined) return l;
              const keeperByTeam = { ...draftState.keeperByTeam };
              const keeperSlotByPlayer = { ...draftState.keeperSlotByPlayer };
              delete keeperByTeam[playerId];
              delete keeperSlotByPlayer[playerId];
              return {
                ...l,
                draftState: {
                  ...draftState,
                  keeperByTeam,
                  keeperSlotByPlayer,
                  pickIndex: getNextOpenPickIndex(
                    l.leagueSettings.leagueSize,
                    getDraftCursorBase({
                      ...draftState,
                      keeperByTeam,
                      keeperSlotByPlayer,
                    }),
                    draftState.format,
                    {
                      ...draftState,
                      keeperByTeam,
                      keeperSlotByPlayer,
                    }
                  ),
                },
                updatedAt: Date.now(),
              };
            }),
          };
        }),

      setDraftMode: (enabled) =>
        set((state) => {
          if (!enabled) return { isDraftMode: false };
          const activeId = state.activeLeagueId ?? state.leagues[0]?.id;
          if (!activeId) return { isDraftMode: true };
          return {
            isDraftMode: true,
            leagues: state.leagues.map((league) =>
              league.id === activeId
                ? {
                    ...league,
                    draftState: (() => {
                      const draftState = migrateDraftState(league.draftState);
                      return {
                        ...draftState,
                        pickIndex: getNextOpenPickIndex(
                          league.leagueSettings.leagueSize,
                          getDraftCursorBase(draftState),
                          draftState.format,
                          draftState
                        ),
                      };
                    })(),
                  }
                : league
            ),
          };
        }),
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
                    draftState: (() => {
                      const draftState = migrateDraftState(l.draftState);
                      const nextDraftState: DraftState = {
                        ...draftState,
                        draftedByTeam: {},
                        history: [],
                        pickIndex: 0,
                      };
                      return {
                        ...nextDraftState,
                        pickIndex: getNextOpenPickIndex(
                          l.leagueSettings.leagueSize,
                          getDraftCursorBase(nextDraftState),
                          nextDraftState.format,
                          nextDraftState
                        ),
                      };
                    })(),
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
            draftState: createDefaultDraftState(),
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
      version: 6,
      migrate: (persistedState, version) => {
        if (version >= 6) return persistedState as Store;

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

        const state = persistedState as V4State;

        const scoringSettings = state.scoringSettings ?? defaultScoringSettings;
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
          ...state,
          leagues: [league],
          activeLeagueId: league.id,
        };
      },
    }
  )
);

export {
  createDefaultDraftState,
  defaultScoringSettings,
  defaultLeagueSettings,
  defaultRosterSettings,
};
