import "fake-indexeddb/auto";
import { describe, test, expect, beforeEach } from "bun:test";
import type { ProjectionGroup, League } from "@/types";
import {
  defaultScoringSettings,
  defaultLeagueSettings,
  createDefaultDraftState,
} from "@/lib/league";

// ---------------------------------------------------------------------------
// Dynamic imports for Dexie-dependent modules (must happen AFTER polyfill)
// ---------------------------------------------------------------------------

async function loadPersistenceModules() {
  const persistence = await import("@/lib/persistence");
  const dbModule = await import("@/lib/db");
  return {
    migrate: persistence.migrate,
    dexieStorage: persistence.dexieStorage,
    migrateFromLocalStorage: persistence.migrateFromLocalStorage,
    STORAGE_KEY_LEAGUES: persistence.STORAGE_KEY_LEAGUES,
    STORAGE_KEY_PROJECTIONS: persistence.STORAGE_KEY_PROJECTIONS,
    STORAGE_KEY_PREFERENCES: persistence.STORAGE_KEY_PREFERENCES,
    LEGACY_STORAGE_KEY: persistence.LEGACY_STORAGE_KEY,
    db: dbModule.db,
  };
}

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
  let migrate: Awaited<ReturnType<typeof loadPersistenceModules>>["migrate"];

  beforeEach(async () => {
    const modules = await loadPersistenceModules();
    migrate = modules.migrate;
  });

  test("version 6 produces valid state with leagues array", async () => {
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

  test("version 7 produces valid state with leagues array", async () => {
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

  test("version 8 normalizes leagues and projectionGroups", async () => {
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

  test("pre-v6 (v4 shape with flat settings) produces leagues array", async () => {
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

  test("handles undefined state gracefully", async () => {
    const result = migrate(undefined, 6);
    // Should not throw; result may vary but should be object-ish
    expect(result).toBeDefined();
  });

  test("handles null state gracefully", async () => {
    const result = migrate(null, 6);
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// dexieStorage
// ---------------------------------------------------------------------------

describe("dexieStorage", () => {
  let dexieStorage: Awaited<ReturnType<typeof loadPersistenceModules>>["dexieStorage"];
  let db: Awaited<ReturnType<typeof loadPersistenceModules>>["db"];

  beforeEach(async () => {
    const modules = await loadPersistenceModules();
    dexieStorage = modules.dexieStorage;
    db = modules.db;
    await db.store.clear();
  });

  test("getItem returns null when nothing stored", async () => {
    const result = await dexieStorage.getItem("pointer-storage");
    expect(result).toBeNull();
  });

  test("setItem + getItem round-trips correctly", async () => {
    const state = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    const blob = JSON.stringify({ state, version: 8 });
    await dexieStorage.setItem("pointer-storage", blob);

    const raw = await dexieStorage.getItem("pointer-storage");
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.state.leagues).toEqual(state.leagues);
    expect(parsed.state.projectionGroups).toEqual(state.projectionGroups);
    expect(parsed.state.isDraftMode).toBe(false);
    expect(parsed.version).toBe(8);
  });

  test("removeItem clears the key", async () => {
    await dexieStorage.setItem("pointer-storage", JSON.stringify({ state: {}, version: 8 }));
    expect(await dexieStorage.getItem("pointer-storage")).not.toBeNull();

    await dexieStorage.removeItem("pointer-storage");
    expect(await dexieStorage.getItem("pointer-storage")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// migrateFromLocalStorage
// ---------------------------------------------------------------------------

describe("migrateFromLocalStorage", () => {
  let dexieStorage: Awaited<ReturnType<typeof loadPersistenceModules>>["dexieStorage"];
  let migrateFromLocalStorage: Awaited<ReturnType<typeof loadPersistenceModules>>["migrateFromLocalStorage"];
  let db: Awaited<ReturnType<typeof loadPersistenceModules>>["db"];
  let STORAGE_KEY_LEAGUES: Awaited<ReturnType<typeof loadPersistenceModules>>["STORAGE_KEY_LEAGUES"];
  let STORAGE_KEY_PROJECTIONS: Awaited<ReturnType<typeof loadPersistenceModules>>["STORAGE_KEY_PROJECTIONS"];
  let STORAGE_KEY_PREFERENCES: Awaited<ReturnType<typeof loadPersistenceModules>>["STORAGE_KEY_PREFERENCES"];
  let LEGACY_STORAGE_KEY: Awaited<ReturnType<typeof loadPersistenceModules>>["LEGACY_STORAGE_KEY"];
  let mockStorage: Storage;

  beforeEach(async () => {
    const modules = await loadPersistenceModules();
    dexieStorage = modules.dexieStorage;
    migrateFromLocalStorage = modules.migrateFromLocalStorage;
    db = modules.db;
    STORAGE_KEY_LEAGUES = modules.STORAGE_KEY_LEAGUES;
    STORAGE_KEY_PROJECTIONS = modules.STORAGE_KEY_PROJECTIONS;
    STORAGE_KEY_PREFERENCES = modules.STORAGE_KEY_PREFERENCES;
    LEGACY_STORAGE_KEY = modules.LEGACY_STORAGE_KEY;
    mockStorage = createMockStorage();
    globalThis.localStorage = mockStorage;
    await db.store.clear();
  });

  test("returns null when no localStorage data exists", async () => {
    const result = await migrateFromLocalStorage();
    expect(result).toBeNull();
  });

  test("migrates legacy single-key format to Dexie", async () => {
    const legacyData = JSON.stringify({
      state: { leagues: [], projectionGroups: [] },
      version: 5,
    });
    mockStorage.setItem(LEGACY_STORAGE_KEY, legacyData);

    const result = await migrateFromLocalStorage();
    expect(result).toBe(legacyData);

    // Dexie should now hold the data
    const dexieRaw = await dexieStorage.getItem(LEGACY_STORAGE_KEY);
    expect(dexieRaw).toBe(legacyData);

    // localStorage should be cleaned up
    expect(mockStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  test("migrates split keys to Dexie", async () => {
    const state = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    mockStorage.setItem(
      STORAGE_KEY_LEAGUES,
      JSON.stringify({ leagues: state.leagues, activeLeagueId: state.activeLeagueId }),
    );
    mockStorage.setItem(
      STORAGE_KEY_PROJECTIONS,
      JSON.stringify({ projectionGroups: state.projectionGroups, activeProjectionGroupId: state.activeProjectionGroupId }),
    );
    mockStorage.setItem(
      STORAGE_KEY_PREFERENCES,
      JSON.stringify({ isDraftMode: state.isDraftMode, mergeTwoWayRankings: state.mergeTwoWayRankings, _version: 8 }),
    );

    const result = await migrateFromLocalStorage();
    expect(result).not.toBeNull();

    const parsed = JSON.parse(result!);
    expect(parsed.state.leagues).toEqual(state.leagues);
    expect(parsed.version).toBe(8);

    // localStorage should be cleaned up
    expect(mockStorage.getItem(STORAGE_KEY_LEAGUES)).toBeNull();
    expect(mockStorage.getItem(STORAGE_KEY_PROJECTIONS)).toBeNull();
    expect(mockStorage.getItem(STORAGE_KEY_PREFERENCES)).toBeNull();
  });

  test("does not overwrite existing Dexie data", async () => {
    await dexieStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ state: { exists: true }, version: 8 }),
    );

    mockStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ state: { new: true }, version: 8 }),
    );

    const result = await migrateFromLocalStorage();
    expect(result).toBeNull();

    // Dexie data should remain unchanged
    const dexieRaw = await dexieStorage.getItem(LEGACY_STORAGE_KEY);
    expect(dexieRaw).not.toBeNull();
    expect(JSON.parse(dexieRaw!).state.exists).toBe(true);
  });
});
