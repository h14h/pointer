import { describe, expect, it } from "bun:test";
import { buildBackupPayload } from "./exportBackup";
import type { League } from "@/types";

const league = { id: "lg-1", name: "Test" } as League;

describe("buildBackupPayload", () => {
  it("wraps leagues in a versioned backup", () => {
    const backup = buildBackupPayload({
      leagues: [league],
      projectionGroups: [],
      now: () => new Date("2026-08-13T12:00:00.000Z"),
    });
    expect(backup).toMatchObject({
      kind: "draftspa-backup",
      version: 1,
      exportedAt: "2026-08-13T12:00:00.000Z",
      leagues: [league],
      projectionGroups: [],
    });
  });
});
