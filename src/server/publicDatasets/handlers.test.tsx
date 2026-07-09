// @vitest-environment node

// Unit tests for the shared HTTP handler core (mocked storage). The full
// byte-exact behavior — real storage fallback, headers, error shapes — is
// locked by src/test/contracts/publicDatasets/start-contract.test.tsx.

import { afterEach, describe, expect, it, vi } from "vitest";

const getPublicDatasetManifestMock = vi.fn();
const getPublicDatasetBySlugMock = vi.fn();

vi.mock("@/server/publicDatasets/storage", async () => {
  const actual = await vi.importActual<typeof import("@/server/publicDatasets/storage")>(
    "@/server/publicDatasets/storage"
  );

  return {
    ...actual,
    getPublicDatasetManifest: getPublicDatasetManifestMock,
    getPublicDatasetBySlug: getPublicDatasetBySlugMock,
  };
});

describe("public dataset API handlers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the manifest payload from the manifest handler", async () => {
    getPublicDatasetManifestMock.mockResolvedValue({
      datasets: [
        {
          slug: "historical-2025",
          name: "2025 Prior-Year Baseline",
          season: 2025,
          datasetType: "historical-stats",
          default: true,
        },
      ],
    });

    const { handleGetPublicDatasetManifest } = await import(
      "@/server/publicDatasets/handlers"
    );
    const response = await handleGetPublicDatasetManifest();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      datasets: [
        {
          slug: "historical-2025",
          name: "2025 Prior-Year Baseline",
          season: 2025,
          datasetType: "historical-stats",
          default: true,
        },
      ],
    });
  });

  it("returns the dataset payload from the slug handler", async () => {
    getPublicDatasetBySlugMock.mockResolvedValue({
      slug: "historical-2025",
      name: "2025 Prior-Year Baseline",
      season: 2025,
      datasetType: "historical-stats",
      projectionGroup: {
        id: "public-historical-2025",
        name: "2025 Prior-Year Stats",
        createdAt: "2026-01-01T00:00:00.000Z",
        batters: [],
        pitchers: [],
        twoWayPlayers: [],
        batterIdSource: "MLBAMID",
        pitcherIdSource: "MLBAMID",
      },
    });

    const { handleGetPublicDataset } = await import(
      "@/server/publicDatasets/handlers"
    );
    const response = await handleGetPublicDataset("historical-2025");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      slug: "historical-2025",
      projectionGroup: {
        id: "public-historical-2025",
      },
    });
  });
});
