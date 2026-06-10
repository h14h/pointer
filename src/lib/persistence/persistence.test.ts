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
    db: dbModule.db,
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

  test("pre-v10 data is treated as already onboarded", async () => {
    const input = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [makeProjectionGroup()],
      activeProjectionGroupId: "pg-1",
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    for (const version of [6, 7, 8, 9]) {
      const result = migrate(input, version) as { hasOnboarded?: boolean };
      expect(result.hasOnboarded).toBe(true);
    }
  });

  test("pre-v10 leagues default to baseball sport", async () => {
    const input = {
      leagues: [makeLeague()],
      activeLeagueId: "league-1",
      projectionGroups: [],
      activeProjectionGroupId: null,
      isDraftMode: false,
      mergeTwoWayRankings: true,
    };

    const result = migrate(input, 9) as { leagues: { sport?: string }[] };
    expect(result.leagues[0].sport).toBe("baseball");
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
