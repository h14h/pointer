import { describe, test, expect, beforeEach } from "bun:test";
import {
  splitStorage,
  migrate,
  STORAGE_KEY_LEAGUES,
  STORAGE_KEY_PROJECTIONS,
  STORAGE_KEY_PREFERENCES,
  LEGACY_STORAGE_KEY,
} from "@/lib/persistence";
import type { ProjectionGroup, League } from "@/types";
import {
  defaultScoringSettings,
  defaultLeagueSettings,
  createDefaultDraftState,
} from "@/lib/league";

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLeague(overrides?: Partial<League>): League {
  return {
    id: "league-1",
    name: "Test League",
    scoringSettings: { ...defaultScoringSettings },
    leagueSettings: { ...defaultLeagueSettings },
    draftState: createDefaultDraftState(),
    updatedAt: 1000,
    ...overrides,
  };
}

function makeProjectionGroup(overrides?: Partial<ProjectionGroup>): ProjectionGroup {
  return {
    id: "pg-1",
    name: "Test Projections",
    createdAt: new Date().toISOString(),
    source: { kind: "upload" },
    batters: [],
    pitchers: [],
    twoWayPlayers: [],
    batterIdSource: null,
    pitcherIdSource: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// migrate()
// ---------------------------------------------------------------------------

describe("migrate", () => {
  test("version 6 produces valid state with leagues array", () => {
    const input = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    const result = migrate(input, 6) as typeof input;

    expect(Array.isArray(result.leagues)).toBe(true);
    expect(result.leagues.length).toBe(1);
    expect(result.leagues[0].id).toBe("league-1");
  });

  test("version 7 produces valid state with leagues array", () => {
    const input = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    const result = migrate(input, 7) as typeof input;

    expect(Array.isArray(result.leagues)).toBe(true);
    expect(result.leagues.length).toBe(1);
    expect(result.leagues[0].id).toBe("league-1");
  });

  test("version 8 normalizes leagues and projectionGroups", () => {
    const group = makeProjectionGroup({
      source: undefined as unknown as ProjectionGroup["source"],
      eligibilityImportSeason: undefined,
    });
    const input = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [group],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    const result = migrate(input, 8) as typeof input;

    expect(Array.isArray(result.leagues)).toBe(true);
    expect(Array.isArray(result.projectionGroups)).toBe(true);
    // Source should be normalized to upload
    expect(result.projectionGroups[0].source).toEqual({ kind: "upload" });
    // eligibilityImportSeason should have been filled
    expect(typeof result.projectionGroups[0].eligibilityImportSeason).toBe("number");
  });

  test("pre-v6 (v4 shape with flat settings) produces leagues array", () => {
    const v4State = {
      scoringSettings: { ...defaultScoringSettings },
      leagueSettings: { ...defaultLeagueSettings },
      draftState: {
        format: "snake" as const,
        draftedByTeam: {},
        keeperByTeam: {},
        keeperSlotByPlayer: {},
        pickIndex: 0,
        history: [],
      },
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    const result = migrate(v4State, 4) as {
      leagues: League[];
      activeLeagueId: string;
    };

    expect(Array.isArray(result.leagues)).toBe(true);
    expect(result.leagues.length).toBe(1);
    expect(result.leagues[0].name).toBe("My League");
    expect(typeof result.activeLeagueId).toBe("string");
  });

  test("handles undefined state gracefully", () => {
    const result = migrate(undefined, 6);
    // Should not throw; result may vary but should be object-ish
    expect(result).toBeDefined();
  });

  test("handles null state gracefully", () => {
    const result = migrate(null, 6);
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// splitStorage
// ---------------------------------------------------------------------------

describe("splitStorage", () => {
  let mockStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    // Inject into globalThis so getStorage() finds it
    globalThis.localStorage = mockStorage;
  });

  test("getItem returns null when nothing stored", () => {
    const result = splitStorage.getItem("pointer-storage");
    expect(result).toBeNull();
  });

  test("setItem + getItem round-trips correctly", () => {
    const state = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    splitStorage.setItem("pointer-storage", JSON.stringify({ state, version: 8 }));

    const raw = splitStorage.getItem("pointer-storage");
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.state.leagues).toEqual(state.leagues);
    expect(parsed.state.projectionGroups).toEqual(state.projectionGroups);
    expect(parsed.state.isDraftMode).toBe(false);
    expect(parsed.version).toBe(8);
  });

  test("setItem splits data into separate localStorage keys", () => {
    const state = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    splitStorage.setItem("pointer-storage", JSON.stringify({ state, version: 8 }));

    // Verify individual keys were written
    expect(mockStorage.getItem(STORAGE_KEY_LEAGUES)).not.toBeNull();
    expect(mockStorage.getItem(STORAGE_KEY_PROJECTIONS)).not.toBeNull();
    expect(mockStorage.getItem(STORAGE_KEY_PREFERENCES)).not.toBeNull();

    // Verify content of split keys
    const leagues = JSON.parse(mockStorage.getItem(STORAGE_KEY_LEAGUES)!);
    expect(leagues.leagues).toEqual(state.leagues);
    expect(leagues.activeLeagueId).toBe("league-1");

    const projections = JSON.parse(mockStorage.getItem(STORAGE_KEY_PROJECTIONS)!);
    expect(projections.projectionGroups).toEqual(state.projectionGroups);

    const preferences = JSON.parse(mockStorage.getItem(STORAGE_KEY_PREFERENCES)!);
    expect(preferences.isDraftMode).toBe(false);
    expect(preferences._version).toBe(8);
  });

  test("removeItem clears all keys", () => {
    const state = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    splitStorage.setItem("pointer-storage", JSON.stringify({ state, version: 8 }));

    // All split keys should be set
    expect(mockStorage.getItem(STORAGE_KEY_LEAGUES)).not.toBeNull();

    splitStorage.removeItem("pointer-storage");

    // All keys should now be cleared
    expect(mockStorage.getItem(STORAGE_KEY_LEAGUES)).toBeNull();
    expect(mockStorage.getItem(STORAGE_KEY_PROJECTIONS)).toBeNull();
    expect(mockStorage.getItem(STORAGE_KEY_PREFERENCES)).toBeNull();
    expect(mockStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  test("getItem reads from legacy key when present", () => {
    const legacyData = JSON.stringify({
      state: { leagues: [], projectionGroups: [] },
      version: 5,
    });
    mockStorage.setItem(LEGACY_STORAGE_KEY, legacyData);

    const result = splitStorage.getItem("pointer-storage");
    expect(result).toBe(legacyData);
  });

  test("setItem removes legacy key after split write", () => {
    mockStorage.setItem(LEGACY_STORAGE_KEY, "old-data");

    const state = {
      leagues: [],
      activeLeagueId: null,
      projectionGroups: [],
      activeProjectionGroupId: null,
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    splitStorage.setItem("pointer-storage", JSON.stringify({ state, version: 8 }));

    expect(mockStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });
});
