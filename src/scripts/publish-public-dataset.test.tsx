// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    vi.clearAllMocks();
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
