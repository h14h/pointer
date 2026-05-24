// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";

const putPublicDatasetObjectMock = vi.fn();

vi.mock("@/server/publicDatasets/core", async () => {
  const actual = await vi.importActual<typeof import("@/server/publicDatasets/core")>(
    "@/server/publicDatasets/core"
  );

  return {
    ...actual,
    putPublicDatasetObject: putPublicDatasetObjectMock,
  };
});

describe("publish public datasets script", () => {
  const DATASET_DIR = path.join(process.cwd(), "data", "public-datasets");
  const TEST_DATASET_PATH = path.join(DATASET_DIR, "historical-2025.json");

  beforeEach(async () => {
    // Create a minimal dataset fixture so loadLocalDatasets finds a matching file
    await writeFile(
      TEST_DATASET_PATH,
      JSON.stringify({
        slug: "historical-2025",
        name: "2025 Prior-Year Baseline",
        season: 2025,
        datasetType: "historical-stats",
        projectionGroup: {
          id: "test-historical-2025",
          name: "2025 Prior-Year Baseline",
          createdAt: new Date().toISOString(),
          batters: [],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: null,
          pitcherIdSource: null,
        },
      })
    );
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await rm(TEST_DATASET_PATH, { force: true });
  });

  it("publishes every dataset file and the manifest to the expected object keys", async () => {
    const { publishPublicDatasets } = await import("../../scripts/publish-public-dataset");

    await publishPublicDatasets();

    expect(putPublicDatasetObjectMock).toHaveBeenCalledWith(
      "public-datasets/historical-2025.json",
      expect.stringContaining('"slug": "historical-2025"')
    );
    expect(putPublicDatasetObjectMock).toHaveBeenCalledWith(
      "public-datasets/manifest.json",
      expect.stringContaining('"default": true')
    );
  });

  it("rejects manifest and dataset slug mismatches", async () => {
    const { validateManifestAgainstDatasets } = await import("../../scripts/publish-public-dataset");

    expect(() =>
      validateManifestAgainstDatasets(
        {
          datasets: [
            {
              slug: "historical-2025",
              name: "2025 Prior-Year Baseline",
              season: 2025,
              datasetType: "historical-stats",
              default: true,
            },
          ],
        },
        ["other-dataset"]
      )
    ).toThrow("Manifest slug mismatch");
  });
});
