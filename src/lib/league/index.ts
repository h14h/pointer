import type {
  ScoringSettings,
  DraftState,
  LeagueSettings,
  RosterSettings,
  RosterSlot,
  League,
} from "@/types";
import { randomUUID } from "@/lib/uuid";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const INITIAL_LEAGUE_ID = "default-league";

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

// Default ESPN-style scoring
export const defaultScoringSettings: ScoringSettings = {
  name: "Default",
  batting: {
    R: 1,
    H: 0, // Usually score by hit type instead
    "1B": 1,
    "2B": 2,
    "3B": 3,
    HR: 4,
    RBI: 1,
    SB: 1,
    CS: -1,
    BB: 1,
    IBB: 0,
    SO: -1,
    HBP: 1,
    SF: 0,
    GDP: 0,
  },
  pitching: {
    IP: 3, // 3 points per IP (1 per out)
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

export const defaultRosterSettings: RosterSettings = {
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

export const defaultLeagueSettings: LeagueSettings = {
  leagueSize: 12,
  teamNames: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
  roster: defaultRosterSettings,
  weeklyStartLimit: null,
};

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export const createDefaultDraftState = (): DraftState => ({
  format: "snake",
  draftedByTeam: {},
  keeperByTeam: {},
  keeperSlotByPlayer: {},
  pickIndex: 0,
  history: [],
});

export const createDefaultLeague = (
  name = "My League",
  options?: { deterministic?: boolean }
): League => ({
  id: options?.deterministic ? INITIAL_LEAGUE_ID : randomUUID(),
  name,
  scoringSettings: { ...defaultScoringSettings },
  leagueSettings: { ...defaultLeagueSettings },
  draftState: createDefaultDraftState(),
  updatedAt: options?.deterministic ? 0 : Date.now(),
});

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

export const normalizeScoringSettings = (settings: ScoringSettings): ScoringSettings => ({
  ...settings,
  batting: {
    ...settings.batting,
    IBB: settings.batting.IBB ?? 0,
  },
});

export const normalizeLeagueSettings = (settings: LeagueSettings): LeagueSettings => {
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

export const normalizeLeague = (league: League): League => ({
  ...league,
  scoringSettings: normalizeScoringSettings(league.scoringSettings),
  leagueSettings: normalizeLeagueSettings(league.leagueSettings),
  updatedAt: league.updatedAt ?? Date.now(),
});

// ---------------------------------------------------------------------------
// Draft structure change detection
// ---------------------------------------------------------------------------

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

/**
 * Returns `true` when the change from `previous` to `next` league settings is
 * safe (i.e. it does NOT invalidate the current draft structure).
 *
 * Renamed from the store's `isBlockedDraftStructureChange` — the old function
 * returned `true` when the change was *blocked*; this function inverts that
 * for a more intuitive API: `true` means "safe to apply".
 */
export function isStructureChangeSafe(previous: LeagueSettings, next: LeagueSettings): boolean {
  if (previous.leagueSize !== next.leagueSize) return false;
  if (previous.teamNames.length !== next.teamNames.length) return false;
  const sameOrder = previous.teamNames.every(
    (teamName, index) => teamName === next.teamNames[index]
  );
  if (sameOrder) return true;
  return !areSameStringMultiset(previous.teamNames, next.teamNames);
}

// ---------------------------------------------------------------------------
// Scoring presets (absorbed from src/lib/presets.ts)
// ---------------------------------------------------------------------------

export const scoringPresets: Record<string, ScoringSettings> = {
  espn: {
    name: "ESPN Standard",
    batting: {
      R: 1,
      H: 0,
      "1B": 1,
      "2B": 2,
      "3B": 3,
      HR: 4,
      RBI: 1,
      SB: 1,
      CS: -1,
      BB: 1,
      IBB: 0,
      SO: -1,
      HBP: 1,
      SF: 0,
      GDP: 0,
    },
    pitching: {
      IP: 3,
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
  },

  yahoo: {
    name: "Yahoo Standard",
    batting: {
      R: 1,
      H: 0,
      "1B": 1,
      "2B": 2,
      "3B": 3,
      HR: 4,
      RBI: 1,
      SB: 2,
      CS: -1,
      BB: 1,
      IBB: 0,
      SO: -0.5,
      HBP: 1,
      SF: 0,
      GDP: 0,
    },
    pitching: {
      IP: 2.5,
      W: 5,
      L: -3,
      QS: 3,
      CG: 0,
      ShO: 0,
      SV: 5,
      BS: -3,
      HLD: 2,
      SO: 1,
      H: -0.5,
      ER: -1,
      HR: -1,
      BB: -0.5,
      HBP: 0,
    },
  },

  fantrax: {
    name: "Fantrax Default",
    batting: {
      R: 1,
      H: 0,
      "1B": 1,
      "2B": 2,
      "3B": 3,
      HR: 4,
      RBI: 1,
      SB: 2,
      CS: -1,
      BB: 1,
      IBB: 0,
      SO: -1,
      HBP: 1,
      SF: 0,
      GDP: -0.5,
    },
    pitching: {
      IP: 3,
      W: 7,
      L: -5,
      QS: 5,
      CG: 0,
      ShO: 0,
      SV: 7,
      BS: -5,
      HLD: 3,
      SO: 2,
      H: -1,
      ER: -2,
      HR: -1,
      BB: -1,
      HBP: -1,
    },
  },

  blank: {
    name: "Blank (All Zeros)",
    batting: {
      R: 0,
      H: 0,
      "1B": 0,
      "2B": 0,
      "3B": 0,
      HR: 0,
      RBI: 0,
      SB: 0,
      CS: 0,
      BB: 0,
      IBB: 0,
      SO: 0,
      HBP: 0,
      SF: 0,
      GDP: 0,
    },
    pitching: {
      IP: 0,
      W: 0,
      L: 0,
      QS: 0,
      CG: 0,
      ShO: 0,
      SV: 0,
      BS: 0,
      HLD: 0,
      SO: 0,
      H: 0,
      ER: 0,
      HR: 0,
      BB: 0,
      HBP: 0,
    },
  },
};

export const presetNames = Object.keys(scoringPresets);
