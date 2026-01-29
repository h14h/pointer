import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Player,
  ScoringSettings,
  DraftState,
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
  batters: Player[];
  pitchers: Player[];
  scoringSettings: ScoringSettings;
  draftState: DraftState;
  isDraftMode: boolean;

  // Actions
  setBatters: (batters: Player[]) => void;
  setPitchers: (pitchers: Player[]) => void;
  setScoringSettings: (settings: ScoringSettings) => void;
  updateBattingScoring: (key: keyof ScoringSettings["batting"], value: number) => void;
  updatePitchingScoring: (key: keyof ScoringSettings["pitching"], value: number) => void;
  toggleDrafted: (playerId: string) => void;
  toggleKeeper: (playerId: string) => void;
  setDraftMode: (enabled: boolean) => void;
  resetDraft: () => void;
  clearAllData: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      // Initial state
      batters: [],
      pitchers: [],
      scoringSettings: defaultScoringSettings,
      draftState: {
        draftedIds: [],
        keeperIds: [],
      },
      isDraftMode: false,

      // Actions
      setBatters: (batters) => set({ batters }),

      setPitchers: (pitchers) => set({ pitchers }),

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

      resetDraft: () =>
        set({
          draftState: {
            draftedIds: [],
            keeperIds: [],
          },
        }),

      clearAllData: () =>
        set({
          batters: [],
          pitchers: [],
          draftState: {
            draftedIds: [],
            keeperIds: [],
          },
        }),
    }),
    {
      name: "pointer-storage",
    }
  )
);

export { defaultScoringSettings };
