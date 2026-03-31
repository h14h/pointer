import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import {
  defaultScoringSettings,
  defaultRosterSettings,
  defaultLeagueSettings,
  createDefaultDraftState,
  createDefaultLeague,
  normalizeScoringSettings,
  normalizeLeague,
  normalizeLeagueSettings,
  isStructureChangeSafe,
  INITIAL_LEAGUE_ID,
  scoringPresets,
  presetNames,
} from "@/lib/league";
import { UPLOAD_PROJECTION_SOURCE } from "@/lib/projections";
import type { LeagueSettings, ScoringSettings } from "@/types";

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const leagueSettingsArb: fc.Arbitrary<LeagueSettings> = fc.record({
  leagueSize: fc.integer({ min: -5, max: 50 }),
  teamNames: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
    minLength: 0,
    maxLength: 25,
  }),
  roster: fc.constant(defaultRosterSettings),
  weeklyStartLimit: fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    fc.integer({ min: -5, max: 100 })
  ),
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe("normalizeLeagueSettings", () => {
  test("is idempotent: normalize(normalize(x)) === normalize(x)", () => {
    fc.assert(
      fc.property(leagueSettingsArb, (settings) => {
        const once = normalizeLeagueSettings(settings);
        const twice = normalizeLeagueSettings(once);
        expect(twice).toEqual(once);
      })
    );
  });

  test("league size is always clamped to [2, 20]", () => {
    fc.assert(
      fc.property(leagueSettingsArb, (settings) => {
        const result = normalizeLeagueSettings(settings);
        expect(result.leagueSize).toBeGreaterThanOrEqual(2);
        expect(result.leagueSize).toBeLessThanOrEqual(20);
      })
    );
  });

  test("after normalization, teamNames.length === leagueSize", () => {
    fc.assert(
      fc.property(leagueSettingsArb, (settings) => {
        const result = normalizeLeagueSettings(settings);
        expect(result.teamNames.length).toBe(result.leagueSize);
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe("normalizeScoringSettings", () => {
  test("defaults IBB to 0 when undefined", () => {
    const settings = {
      ...defaultScoringSettings,
      batting: {
        ...defaultScoringSettings.batting,
        IBB: undefined,
      },
    } as unknown as ScoringSettings;

    const result = normalizeScoringSettings(settings);
    expect(result.batting.IBB).toBe(0);
  });

  test("preserves existing IBB value", () => {
    const settings: ScoringSettings = {
      ...defaultScoringSettings,
      batting: { ...defaultScoringSettings.batting, IBB: 5 },
    };
    const result = normalizeScoringSettings(settings);
    expect(result.batting.IBB).toBe(5);
  });
});

describe("createDefaultLeague", () => {
  test("produces valid League with all required fields", () => {
    const league = createDefaultLeague();
    expect(league.id).toBeTypeOf("string");
    expect(league.id.length).toBeGreaterThan(0);
    expect(league.name).toBe("My League");
    expect(league.scoringSettings).toBeDefined();
    expect(league.leagueSettings).toBeDefined();
    expect(league.draftState).toBeDefined();
    expect(league.updatedAt).toBeTypeOf("number");
  });

  test("accepts custom name", () => {
    const league = createDefaultLeague("Test League");
    expect(league.name).toBe("Test League");
  });

  test("deterministic option produces stable id and timestamp", () => {
    const league = createDefaultLeague("Det", { deterministic: true });
    expect(league.id).toBe(INITIAL_LEAGUE_ID);
    expect(league.updatedAt).toBe(0);
  });
});

describe("createDefaultDraftState", () => {
  test("produces empty draft state", () => {
    const state = createDefaultDraftState();
    expect(state.format).toBe("snake");
    expect(state.draftedByTeam).toEqual({});
    expect(state.keeperByTeam).toEqual({});
    expect(state.keeperSlotByPlayer).toEqual({});
    expect(state.pickIndex).toBe(0);
    expect(state.history).toEqual([]);
  });
});

describe("default settings shapes", () => {
  test("defaultScoringSettings has batting and pitching keys", () => {
    expect(defaultScoringSettings.name).toBe("Default");
    expect(defaultScoringSettings.batting).toBeDefined();
    expect(defaultScoringSettings.pitching).toBeDefined();
    expect(defaultScoringSettings.batting.HR).toBe(4);
    expect(defaultScoringSettings.pitching.W).toBe(5);
  });

  test("defaultRosterSettings has positions and bench", () => {
    expect(defaultRosterSettings.positions).toBeDefined();
    expect(defaultRosterSettings.bench).toBe(3);
    expect(defaultRosterSettings.positions.C).toBe(1);
    expect(defaultRosterSettings.positions.P).toBe(7);
  });

  test("defaultLeagueSettings has expected leagueSize and teamNames", () => {
    expect(defaultLeagueSettings.leagueSize).toBe(12);
    expect(defaultLeagueSettings.teamNames).toHaveLength(12);
    expect(defaultLeagueSettings.roster).toEqual(defaultRosterSettings);
  });
});

describe("isStructureChangeSafe", () => {
  test("returns false when league size changes", () => {
    const prev = normalizeLeagueSettings({ ...defaultLeagueSettings, leagueSize: 10 });
    const next = normalizeLeagueSettings({ ...defaultLeagueSettings, leagueSize: 12 });
    expect(isStructureChangeSafe(prev, next)).toBe(false);
  });

  test("returns true when nothing changes", () => {
    const settings = normalizeLeagueSettings(defaultLeagueSettings);
    expect(isStructureChangeSafe(settings, settings)).toBe(true);
  });

  test("returns true when team names change in place (no reorder)", () => {
    const prev = normalizeLeagueSettings(defaultLeagueSettings);
    const next = normalizeLeagueSettings({
      ...defaultLeagueSettings,
      teamNames: prev.teamNames.map((n, i) => (i === 0 ? "Renamed" : n)),
    });
    expect(isStructureChangeSafe(prev, next)).toBe(true);
  });

  test("returns false when team names are reordered (multiset same)", () => {
    const prev = normalizeLeagueSettings({
      ...defaultLeagueSettings,
      leagueSize: 3,
      teamNames: ["A", "B", "C"],
    });
    const next = normalizeLeagueSettings({
      ...defaultLeagueSettings,
      leagueSize: 3,
      teamNames: ["C", "A", "B"],
    });
    expect(isStructureChangeSafe(prev, next)).toBe(false);
  });
});

describe("constants", () => {
  test("UPLOAD_PROJECTION_SOURCE", () => {
    expect(UPLOAD_PROJECTION_SOURCE).toEqual({ kind: "upload" });
  });

  test("INITIAL_LEAGUE_ID", () => {
    expect(INITIAL_LEAGUE_ID).toBe("default-league");
  });
});

describe("scoring presets", () => {
  test("scoringPresets contains expected keys", () => {
    expect(scoringPresets.espn).toBeDefined();
    expect(scoringPresets.yahoo).toBeDefined();
    expect(scoringPresets.fantrax).toBeDefined();
    expect(scoringPresets.blank).toBeDefined();
  });

  test("presetNames matches keys of scoringPresets", () => {
    expect(presetNames).toEqual(Object.keys(scoringPresets));
  });
});
