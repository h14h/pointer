// @vitest-environment node

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

describe("public dataset API routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the manifest payload from the catalog route", async () => {
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

    const { GET } = await import("@/app/api/public-datasets/route");
    const response = await GET();

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

  it("returns the dataset payload from the slug route", async () => {
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

    const { GET } = await import("@/app/api/public-datasets/[slug]/route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "historical-2025" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      slug: "historical-2025",
      projectionGroup: {
        id: "public-historical-2025",
      },
    });
  });
});

