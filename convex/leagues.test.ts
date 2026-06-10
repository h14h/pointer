import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

// convex-test needs the function modules to build its mock runtime.
// (Explicit list because newer Vite globs don't support the extglob pattern
// from the convex-test docs.)
const modules = import.meta.glob([
  "./**/*.js",
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/*.d.ts",
]);

function makeLeaguePayload(overrides: Partial<{ updatedAt: number; name: string }> = {}) {
  return {
    leagueId: "league-1",
    name: overrides.name ?? "My Football League",
    sport: "football" as const,
    data: JSON.stringify({ id: "league-1", name: overrides.name ?? "My Football League" }),
    updatedAt: overrides.updatedAt ?? 1000,
  };
}

describe("convex leagues functions", () => {
  test("list returns [] when unauthenticated", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.leagues.list, {})).toEqual([]);
  });

  test("upsert and remove reject unauthenticated callers", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.leagues.upsert, makeLeaguePayload())).rejects.toThrow(
      "Not authenticated"
    );
    await expect(t.mutation(api.leagues.remove, { leagueId: "league-1" })).rejects.toThrow(
      "Not authenticated"
    );
  });

  test("upsert inserts then last-write-wins on updates", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    await asUser.mutation(api.leagues.upsert, makeLeaguePayload({ updatedAt: 1000 }));
    let records = await asUser.query(api.leagues.list, {});
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("My Football League");

    // Stale write from a device that's behind is ignored
    await asUser.mutation(
      api.leagues.upsert,
      makeLeaguePayload({ updatedAt: 500, name: "Stale Name" })
    );
    records = await asUser.query(api.leagues.list, {});
    expect(records[0].name).toBe("My Football League");
    expect(records[0].updatedAt).toBe(1000);

    // Newer write lands
    await asUser.mutation(
      api.leagues.upsert,
      makeLeaguePayload({ updatedAt: 2000, name: "Renamed League" })
    );
    records = await asUser.query(api.leagues.list, {});
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("Renamed League");
    expect(records[0].updatedAt).toBe(2000);
  });

  test("leagues are isolated per user", async () => {
    const t = convexTest(schema, modules);
    const alice = t.withIdentity({ subject: "user_alice" });
    const bob = t.withIdentity({ subject: "user_bob" });

    await alice.mutation(api.leagues.upsert, makeLeaguePayload());

    expect(await alice.query(api.leagues.list, {})).toHaveLength(1);
    expect(await bob.query(api.leagues.list, {})).toHaveLength(0);

    // Bob can't delete Alice's league
    await bob.mutation(api.leagues.remove, { leagueId: "league-1" });
    expect(await alice.query(api.leagues.list, {})).toHaveLength(1);
  });

  test("remove deletes the caller's league", async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity({ subject: "user_1" });

    await asUser.mutation(api.leagues.upsert, makeLeaguePayload());
    expect(await asUser.query(api.leagues.list, {})).toHaveLength(1);

    await asUser.mutation(api.leagues.remove, { leagueId: "league-1" });
    expect(await asUser.query(api.leagues.list, {})).toHaveLength(0);
  });
});
