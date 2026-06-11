import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import {
  estimateQualityStarts,
  parsePlayerCSV,
  normalizeProjectionGroup,
  isProtectedProjectionGroup,
  resolveProjectionGroupForLeague,
  leaguesUsingProjectionGroup,
} from "@/lib/projections";
import type { ProjectionGroup } from "@/types";

describe("estimateQualityStarts property tests", () => {
  test("returns non-negative values", () => {
    fc.assert(
      fc.property(
        fc.record({
          GS: fc.integer({ min: 0, max: 35 }),
          IP: fc.double({ min: 0, max: 300, noNaN: true }),
          ERA: fc.double({ min: 0, max: 15, noNaN: true }),
          W: fc.integer({ min: 0, max: 25 }),
        }),
        (input) => {
          const result = estimateQualityStarts(input);
          expect(result).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  test("more IP per start leads to more QS (monotonicity for valid starters)", () => {
    fc.assert(
      fc.property(
        fc.record({
          GS: fc.integer({ min: 10, max: 34 }),
          ERA: fc.double({ min: 1, max: 5, noNaN: true }),
          W: fc.integer({ min: 3, max: 20 }),
        }),
        fc.double({ min: 80, max: 150, noNaN: true }),
        fc.double({ min: 30, max: 79, noNaN: true }),
        (base, highIp, ipDelta) => {
          const lowIp = highIp - ipDelta;
          const qsHigh = estimateQualityStarts({ ...base, IP: highIp });
          const qsLow = estimateQualityStarts({ ...base, IP: lowIp });
          expect(qsHigh).toBeGreaterThanOrEqual(qsLow);
        }
      )
    );
  });
});

describe("CSV player type detection", () => {
  test("detects batter CSV from PA and AB columns", () => {
    const csv = "Name,Team,PA,AB,HR,AVG,OBP,SLG\nJohn Doe,NYY,600,500,30,0.300,0.380,0.550";
    const result = parsePlayerCSV(csv);
    expect(result.type).toBe("batter");
  });

  test("detects pitcher CSV from ERA and WHIP columns", () => {
    const csv = "Name,Team,ERA,WHIP,IP,GS,W,L,SO\nJane Doe,LAD,3.00,1.10,180,30,12,5,200";
    const result = parsePlayerCSV(csv);
    expect(result.type).toBe("pitcher");
  });
});

describe("normalizeProjectionGroup", () => {
  test("adds default upload source if source is missing", () => {
    const group = {
      id: "test-group",
      name: "Test",
      createdAt: "2026-01-01T00:00:00.000Z",
      batters: [],
      pitchers: [],
      twoWayPlayers: [],
      batterIdSource: null,
      pitcherIdSource: null,
    } as unknown as ProjectionGroup;

    const normalized = normalizeProjectionGroup(group);
    expect(normalized.source).toEqual({ kind: "upload" });
  });

  test("preserves existing source when present", () => {
    const source = {
      kind: "public-dataset" as const,
      slug: "historical-2025",
      season: 2025,
      datasetType: "historical-stats" as const,
      protected: true as const,
      seededAt: "2026-01-01T00:00:00.000Z",
    };

    const group: ProjectionGroup = {
      id: "test-group",
      name: "Test",
      createdAt: "2026-01-01T00:00:00.000Z",
      source,
      batters: [],
      pitchers: [],
      twoWayPlayers: [],
      batterIdSource: null,
      pitcherIdSource: null,
    };

    const normalized = normalizeProjectionGroup(group);
    expect(normalized.source).toEqual(source);
  });
});

describe("isProtectedProjectionGroup", () => {
  test("correctly identifies public-dataset groups as protected", () => {
    const group: ProjectionGroup = {
      id: "public-historical-2025",
      name: "2025 Prior-Year Stats",
      createdAt: "2026-01-01T00:00:00.000Z",
      source: {
        kind: "public-dataset",
        slug: "historical-2025",
        season: 2025,
        datasetType: "historical-stats",
        protected: true,
        seededAt: "2026-01-01T00:00:00.000Z",
      },
      batters: [],
      pitchers: [],
      twoWayPlayers: [],
      batterIdSource: null,
      pitcherIdSource: null,
    };

    expect(isProtectedProjectionGroup(group)).toBe(true);
  });

  test("returns false for upload groups", () => {
    const group: ProjectionGroup = {
      id: "user-upload",
      name: "My Upload",
      createdAt: "2026-01-01T00:00:00.000Z",
      source: { kind: "upload" },
      batters: [],
      pitchers: [],
      twoWayPlayers: [],
      batterIdSource: null,
      pitcherIdSource: null,
    };

    expect(isProtectedProjectionGroup(group)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Sport-scoped source resolution (Solstice)
// ---------------------------------------------------------------------------

describe("resolveProjectionGroupForLeague", () => {
  const makeGroup = (id: string, sport: "baseball" | "football"): ProjectionGroup => ({
    id,
    name: id,
    createdAt: new Date().toISOString(),
    sport,
    source: { kind: "upload" },
    batters: [],
    pitchers: [],
    twoWayPlayers: [],
    batterIdSource: null,
    pitcherIdSource: null,
  });

  test("returns the league's own selection when it matches the sport", () => {
    const groups = [makeGroup("bb-1", "baseball"), makeGroup("bb-2", "baseball")];
    const league = { sport: "baseball" as const, projectionGroupId: "bb-2" };
    expect(resolveProjectionGroupForLeague(league, groups)?.id).toBe("bb-2");
  });

  test("ignores a selection from the wrong sport and falls back within-sport", () => {
    const groups = [makeGroup("bb-1", "baseball"), makeGroup("fb-1", "football")];
    const league = { sport: "football" as const, projectionGroupId: "bb-1" };
    expect(resolveProjectionGroupForLeague(league, groups)?.id).toBe("fb-1");
  });

  test("falls back to the sport's best source when nothing selected", () => {
    const groups = [makeGroup("fb-1", "football"), makeGroup("bb-1", "baseball")];
    expect(
      resolveProjectionGroupForLeague({ sport: "baseball", projectionGroupId: null }, groups)?.id,
    ).toBe("bb-1");
  });

  test("returns null when the sport has no sources", () => {
    const groups = [makeGroup("bb-1", "baseball")];
    expect(
      resolveProjectionGroupForLeague({ sport: "football", projectionGroupId: null }, groups),
    ).toBeNull();
  });
});

describe("leaguesUsingProjectionGroup", () => {
  test("lists only same-sport leagues pointing at the group", () => {
    const group: ProjectionGroup = {
      id: "fb-1",
      name: "fb-1",
      createdAt: new Date().toISOString(),
      sport: "football",
      source: { kind: "upload" },
      batters: [],
      pitchers: [],
      twoWayPlayers: [],
      batterIdSource: null,
      pitcherIdSource: null,
    };
    const leagues = [
      { id: "a", sport: "football" as const, projectionGroupId: "fb-1" },
      { id: "b", sport: "football" as const, projectionGroupId: null },
      { id: "c", sport: "baseball" as const, projectionGroupId: "fb-1" },
    ];
    // "a" selected it explicitly; "b" resolves to it via the sport fallback
    // (it's the only football source); "c" is the wrong sport even though it
    // points at the id.
    expect(leaguesUsingProjectionGroup(group, leagues, [group]).map((l) => l.id)).toEqual([
      "a",
      "b",
    ]);
  });
});
