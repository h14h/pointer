import { describe, expect, it } from "bun:test";
import {
  mergeIncomingCloudLeagues,
  parseRemoteLeagueRecord,
  planCloudLeagueSync,
  serializeLeagueForCloud,
  type RemoteLeagueRecord,
  type SerializedCloudLeagueRecord,
} from "@/lib/cloudSync";
import { createDefaultLeague } from "@/lib/league";
import type { League } from "@/types";

function makeLeague(
  id: string,
  updatedAt: number,
  overrides?: Partial<League>,
): League {
  return {
    ...createDefaultLeague(`League ${id}`, { deterministic: true }),
    id,
    name: `League ${id}`,
    updatedAt,
    ...overrides,
  };
}

function makeRemoteRecord(
  league: League,
  updatedAt = league.updatedAt,
): RemoteLeagueRecord {
  return {
    leagueId: league.id,
    name: league.name,
    sport: league.sport,
    league,
    updatedAt,
  };
}

describe("Cloud League sync serialization", () => {
  it("round-trips a league through the cloud adapter shape", () => {
    const league = makeLeague("league-1", 100, {
      projectionGroupId: "missing-local-source",
    });

    const serialized = serializeLeagueForCloud(league);
    const parsed = parseRemoteLeagueRecord(serialized);

    expect(serialized).toMatchObject({
      leagueId: "league-1",
      name: "League league-1",
      sport: "baseball",
      updatedAt: 100,
    });
    expect(parsed?.league.id).toBe("league-1");
    expect(parsed?.league.projectionGroupId).toBe("missing-local-source");
  });

  it("rejects malformed or mismatched remote records", () => {
    const badJson: SerializedCloudLeagueRecord = {
      leagueId: "league-1",
      name: "Broken",
      sport: "baseball",
      data: "{",
      updatedAt: 100,
    };
    const mismatched = serializeLeagueForCloud(makeLeague("league-2", 100));

    expect(parseRemoteLeagueRecord(badJson)).toBeNull();
    expect(
      parseRemoteLeagueRecord({ ...mismatched, leagueId: "league-1" }),
    ).toBeNull();
  });
});

describe("planCloudLeagueSync", () => {
  it("does nothing until sync is enabled, hydrated, and remote records are loaded", () => {
    const local = [makeLeague("league-1", 100)];
    const remote = [makeRemoteRecord(makeLeague("league-1", 200))];

    expect(
      planCloudLeagueSync({
        syncEnabled: false,
        hasHydrated: true,
        localLeagues: local,
        remoteRecords: remote,
        tombstoneLeagueIds: [],
      }),
    ).toMatchObject({
      isReady: false,
      incomingLeagues: [],
      leaguesToUpsert: [],
    });

    expect(
      planCloudLeagueSync({
        syncEnabled: true,
        hasHydrated: false,
        localLeagues: local,
        remoteRecords: remote,
        tombstoneLeagueIds: [],
      }),
    ).toMatchObject({
      isReady: false,
      incomingLeagues: [],
      leaguesToUpsert: [],
    });

    expect(
      planCloudLeagueSync({
        syncEnabled: true,
        hasHydrated: true,
        localLeagues: local,
        remoteRecords: undefined,
        tombstoneLeagueIds: [],
      }),
    ).toMatchObject({
      isReady: false,
      incomingLeagues: [],
      leaguesToUpsert: [],
    });
  });

  it("keeps local primary while reconciling newer remote and newer local leagues", () => {
    const olderLocal = makeLeague("remote-newer", 100);
    const newerLocal = makeLeague("local-newer", 300);
    const remoteRecords = [
      makeRemoteRecord(makeLeague("remote-newer", 200)),
      makeRemoteRecord(makeLeague("local-newer", 200)),
      makeRemoteRecord(makeLeague("remote-only", 50)),
    ];

    const plan = planCloudLeagueSync({
      syncEnabled: true,
      hasHydrated: true,
      localLeagues: [olderLocal, newerLocal],
      remoteRecords,
      tombstoneLeagueIds: [],
    });

    expect(plan.isReady).toBe(true);
    expect(plan.incomingLeagues.map((league) => league.id)).toEqual([
      "remote-newer",
      "remote-only",
    ]);
    expect(plan.leaguesToUpsert.map((league) => league.id)).toEqual([
      "local-newer",
    ]);
    expect(plan.leagueIdsToRemove).toEqual([]);
    expect(plan.tombstoneIdsToClear).toEqual([]);
  });

  it("uses tombstones to delete remote leagues and prevent resurrection", () => {
    const local = [makeLeague("kept", 100)];
    const remoteRecords = [
      makeRemoteRecord(makeLeague("deleted", 200)),
      makeRemoteRecord(makeLeague("kept", 50)),
    ];

    const plan = planCloudLeagueSync({
      syncEnabled: true,
      hasHydrated: true,
      localLeagues: local,
      remoteRecords,
      tombstoneLeagueIds: ["deleted", "already-gone"],
    });

    expect(plan.incomingLeagues).toEqual([]);
    expect(plan.leaguesToUpsert.map((league) => league.id)).toEqual(["kept"]);
    expect(plan.leagueIdsToRemove).toEqual(["deleted"]);
    expect(plan.tombstoneIdsToClear).toEqual(["already-gone"]);
  });
});

describe("mergeIncomingCloudLeagues", () => {
  it("replaces older local leagues, preserves newer local leagues, and adds remote-only leagues", () => {
    const olderLocal = makeLeague("remote-newer", 100, { name: "Old local" });
    const newerLocal = makeLeague("local-newer", 300, { name: "New local" });
    const remoteNewer = makeLeague("remote-newer", 200, { name: "New remote" });
    const remoteOlder = makeLeague("local-newer", 200, { name: "Old remote" });
    const remoteOnly = makeLeague("remote-only", 50);

    const merged = mergeIncomingCloudLeagues({
      localLeagues: [olderLocal, newerLocal],
      incomingLeagues: [remoteNewer, remoteOlder, remoteOnly],
      tombstoneLeagueIds: [],
    });

    expect(merged.map((league) => [league.id, league.name])).toEqual([
      ["remote-newer", "New remote"],
      ["local-newer", "New local"],
      ["remote-only", "League remote-only"],
    ]);
  });

  it("does not add incoming leagues that are locally tombstoned", () => {
    const merged = mergeIncomingCloudLeagues({
      localLeagues: [makeLeague("kept", 100)],
      incomingLeagues: [makeLeague("deleted", 200)],
      tombstoneLeagueIds: ["deleted"],
    });

    expect(merged.map((league) => league.id)).toEqual(["kept"]);
  });
});
