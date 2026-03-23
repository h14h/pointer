import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicDatasetBootstrap } from "@/components/PublicDatasetBootstrap";
import type { ProjectionGroup } from "@/types";

const useStoreMock = vi.fn();
const runProjectionEligibilityImportMock = vi.fn();

vi.mock("@/store", () => ({
  useStore: (selector?: (state: ReturnType<typeof useStoreMock>) => unknown) => {
    const state = useStoreMock();
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/lib/projectionEligibilityImport", () => ({
  runProjectionEligibilityImport: (...args: unknown[]) =>
    runProjectionEligibilityImportMock(...args),
}));

const manifestResponse = {
  datasets: [
    {
      slug: "historical-2025",
      name: "2025 Prior-Year Baseline",
      season: 2025,
      datasetType: "historical-stats" as const,
      default: true,
    },
  ],
};

const payloadResponse = {
  slug: "historical-2025",
  name: "2025 Prior-Year Baseline",
  season: 2025,
  datasetType: "historical-stats" as const,
  projectionGroup: {
    id: "public-historical-2025",
    name: "2025 Prior-Year Stats",
    createdAt: "2026-01-01T00:00:00.000Z",
    batters: [],
    pitchers: [],
    twoWayPlayers: [],
    batterIdSource: "MLBAMID" as const,
    pitcherIdSource: "MLBAMID" as const,
  },
};

function createStoreState(overrides?: Partial<{
  hasHydrated: boolean;
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
}>) {
  const state = {
    hasHydrated: overrides?.hasHydrated ?? true,
    projectionGroups: overrides?.projectionGroups ?? [],
    activeProjectionGroupId: overrides?.activeProjectionGroupId ?? null,
    seedProjectionGroup: vi.fn((group: ProjectionGroup) => {
      state.projectionGroups = [...state.projectionGroups, group];
      state.activeProjectionGroupId = state.activeProjectionGroupId ?? group.id;
    }),
    applyEligibilityForGroup: vi.fn(),
  };
  return state;
}

describe("PublicDatasetBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runProjectionEligibilityImportMock.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("seeds the default public dataset after hydration and auto-imports eligibility", async () => {
    const state = createStoreState();
    useStoreMock.mockImplementation(() => state);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => ({
        ok: true,
        json: async () => (input.endsWith("/api/public-datasets") ? manifestResponse : payloadResponse),
      }))
    );

    render(<PublicDatasetBootstrap />);

    await waitFor(() => {
      expect(state.seedProjectionGroup).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(runProjectionEligibilityImportMock).toHaveBeenCalledTimes(1);
    });

    const seededGroup = state.projectionGroups[0];
    expect(seededGroup?.source.kind).toBe("public-dataset");
    expect(seededGroup?.source.slug).toBe("historical-2025");
  });

  it("does not fetch or re-import when a protected baseline already has eligibility", () => {
    const state = createStoreState({
      projectionGroups: [
        {
          id: "public-historical-2025",
          name: "2025 Prior-Year Stats",
          createdAt: "2026-01-01T00:00:00.000Z",
          source: {
            kind: "public-dataset",
            slug: "historical-2025",
            season: 2025,
            datasetType: "historical-stats",
            protected: true,
            seededAt: "2026-03-22T12:00:00.000Z",
          },
          batters: [],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
          eligibilityImportedAt: "2026-03-22T12:05:00.000Z",
          eligibilitySeason: 2025,
          eligibilityImportSeason: 2025,
        },
      ],
      activeProjectionGroupId: "public-historical-2025",
    });
    const fetchMock = vi.fn();
    useStoreMock.mockImplementation(() => state);
    vi.stubGlobal("fetch", fetchMock);

    render(<PublicDatasetBootstrap />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(runProjectionEligibilityImportMock).not.toHaveBeenCalled();
  });

  it("auto-imports eligibility for an existing built-in group that predates the feature", async () => {
    const state = createStoreState({
      projectionGroups: [
        {
          id: "public-historical-2025",
          name: "2025 Prior-Year Stats",
          createdAt: "2026-01-01T00:00:00.000Z",
          source: {
            kind: "public-dataset",
            slug: "historical-2025",
            season: 2025,
            datasetType: "historical-stats",
            protected: true,
            seededAt: "2026-03-22T12:00:00.000Z",
          },
          batters: [],
          pitchers: [],
          twoWayPlayers: [],
          batterIdSource: "MLBAMID",
          pitcherIdSource: "MLBAMID",
          eligibilityImportSeason: 2025,
        },
      ],
      activeProjectionGroupId: "public-historical-2025",
    });
    const fetchMock = vi.fn();
    useStoreMock.mockImplementation(() => state);
    vi.stubGlobal("fetch", fetchMock);

    render(<PublicDatasetBootstrap />);

    await waitFor(() => {
      expect(runProjectionEligibilityImportMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a retry action after a failed load and seeds on retry", async () => {
    const user = userEvent.setup();
    const state = createStoreState();
    let callCount = 0;
    useStoreMock.mockImplementation(() => state);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        callCount += 1;
        if (callCount === 1) {
          return {
            ok: false,
            json: async () => ({ error: "manifest unavailable" }),
          };
        }

        return {
          ok: true,
          json: async () => (input.endsWith("/api/public-datasets") ? manifestResponse : payloadResponse),
        };
      })
    );

    render(<PublicDatasetBootstrap />);

    expect(await screen.findByText("manifest unavailable")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(state.seedProjectionGroup).toHaveBeenCalledTimes(1);
    });
  });
});
