import { describe, expect, it } from "bun:test";
import datasetFixture from "../../data/public-datasets/historical-2025.json";
import manifestFixture from "../../data/public-datasets/manifest.json";
import {
  createProjectionGroupFromPublicDataset,
  parsePublicDatasetManifest,
  parsePublicDatasetPayload,
} from "@/lib/publicDatasets";

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
  it("parses the checked-in dataset payload", () => {
    const payload = parsePublicDatasetPayload(datasetFixture);

    expect(payload.slug).toBe("historical-2025");
    expect(payload.projectionGroup.name).toBe("2025 Prior-Year Stats");
    expect(payload.projectionGroup.batters.length).toBeGreaterThan(0);
    expect(payload.projectionGroup.pitchers.length).toBeGreaterThan(0);
  });

  it("builds a protected projection group from a public dataset payload", () => {
    const payload = parsePublicDatasetPayload(datasetFixture);
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

