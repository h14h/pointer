import { describe, expect, it } from "bun:test";
import manifestFixture from "../../../data/public-datasets/manifest.json";
import {
  createProjectionGroupFromPublicDataset,
  parsePublicDatasetManifest,
  parsePublicDatasetPayload,
  type PublicDatasetPayload,
} from "@/lib/projections";

const minimalDatasetPayload: PublicDatasetPayload = {
  slug: "historical-2025",
  name: "2025 Prior-Year Baseline",
  season: 2025,
  datasetType: "historical-stats",
  projectionGroup: {
    id: "public-historical-2025",
    name: "2025 Prior-Year Stats",
    createdAt: "2026-03-22T00:00:00.000Z",
    batters: [
      {
        Name: "Test Batter",
        Team: "NYY",
        PlayerId: "1",
        MLBAMID: "100",
        G: 150,
        PA: 600,
        AB: 500,
        H: 150,
        "1B": 90,
        "2B": 30,
        "3B": 5,
        HR: 25,
        R: 80,
        RBI: 75,
        BB: 60,
        IBB: 5,
        SO: 120,
        HBP: 5,
        SF: 3,
        SH: 0,
        GDP: 10,
        SB: 10,
        CS: 3,
        AVG: 0.3,
        OBP: 0.38,
        SLG: 0.5,
        OPS: 0.88,
        ISO: 0.2,
        BABIP: 0.33,
        "wRC+": 130,
        WAR: 4.5,
        ADP: null,
        _type: "batter" as const,
        _id: "100",
      },
    ],
    pitchers: [
      {
        Name: "Test Pitcher",
        Team: "LAD",
        PlayerId: "2",
        MLBAMID: "200",
        W: 12,
        L: 5,
        QS: 18,
        CG: 1,
        ShO: 0,
        G: 30,
        GS: 30,
        SV: 0,
        HLD: 0,
        BS: 0,
        IP: 180,
        H: 140,
        R: 60,
        ER: 55,
        HR: 15,
        BB: 40,
        IBB: 2,
        HBP: 5,
        SO: 200,
        ERA: 2.75,
        WHIP: 1.0,
        "K/9": 10,
        "BB/9": 2,
        FIP: 3.0,
        WAR: 5.0,
        ADP: null,
        _type: "pitcher" as const,
        _id: "200",
      },
    ],
    twoWayPlayers: [],
    batterIdSource: "MLBAMID",
    pitcherIdSource: "MLBAMID",
  },
};

describe("public dataset manifest", () => {
  it("parses the checked-in public dataset catalog", () => {
    const manifest = parsePublicDatasetManifest(manifestFixture);

    expect(manifest.datasets).toHaveLength(1);
    expect(manifest.datasets[0]?.slug).toBe("historical-2025");
    expect(manifest.datasets[0]?.default).toBe(true);
  });

  it("rejects manifests without exactly one default dataset", () => {
    expect(() =>
      parsePublicDatasetManifest({
        datasets: [
          { slug: "a", name: "A", season: 2025, datasetType: "historical-stats", default: false },
        ],
      })
    ).toThrow("exactly one default dataset");
  });
});

describe("public dataset payload", () => {
  it("parses a valid dataset payload", () => {
    const payload = parsePublicDatasetPayload(minimalDatasetPayload);

    expect(payload.slug).toBe("historical-2025");
    expect(payload.projectionGroup.name).toBe("2025 Prior-Year Stats");
    expect(payload.projectionGroup.batters.length).toBeGreaterThan(0);
    expect(payload.projectionGroup.pitchers.length).toBeGreaterThan(0);
  });

  it("builds a protected projection group from a public dataset payload", () => {
    const payload = parsePublicDatasetPayload(minimalDatasetPayload);
    const group = createProjectionGroupFromPublicDataset(payload, "2026-03-22T12:00:00.000Z");

    expect(group.source).toEqual({
      kind: "public-dataset",
      slug: "historical-2025",
      season: 2025,
      datasetType: "historical-stats",
      protected: true,
      seededAt: "2026-03-22T12:00:00.000Z",
    });
    expect(group.name).toBe(payload.projectionGroup.name);
  });
});
