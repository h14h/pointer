import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicDatasetBootstrap } from "@/components/PublicDatasetBootstrap";
import type { BatterPlayer, ProjectionGroup } from "@/types";

const useStoreMock = vi.fn();
const runProjectionEligibilityImportMock = vi.fn();

vi.mock("@/store", () => ({
  useStore: (selector?: (state: ReturnType<typeof useStoreMock>) => unknown) => {
    const state = useStoreMock();
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/lib/eligibility", async () => {
  const actual = await vi.importActual<typeof import("@/lib/eligibility")>("@/lib/eligibility");
  return {
    ...actual,
    runProjectionEligibilityImport: (...args: unknown[]) =>
      runProjectionEligibilityImportMock(...args),
  };
});

const manifestResponse = {
  datasets: [
    {
      slug: "historical-2025",
      name: "2025 Prior-Year Baseline",
      season: 2025,
      sport: "baseball" as const,
      datasetType: "historical-stats" as const,
      default: true,
    },
  ],
};

const payloadResponse = {
  slug: "historical-2025",
  name: "2025 Prior-Year Baseline",
  season: 2025,
  sport: "baseball" as const,
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

const footballPayloadResponse = {
  slug: "football-historical-2025",
  name: "2025 Football Prior-Year Baseline",
  season: 2025,
  sport: "football" as const,
  datasetType: "historical-stats" as const,
  projectionGroup: {
    id: "public-football-historical-2025",
    name: "2025 Football Prior-Year Stats",
    createdAt: "2026-01-01T00:00:00.000Z",
    batters: [],
    pitchers: [],
    twoWayPlayers: [],
    footballPlayers: [
      {
        _type: "football" as const,
        _id: "fb-qb",
        Name: "Test QB",
        Team: "BUF",
        PlayerId: "fb-qb",
        Position: "QB" as const,
        BYE: null,
        PASS_ATT: 0,
        PASS_CMP: 0,
        PASS_YDS: 1,
        PASS_TD: 0,
        PASS_INT: 0,
        RUSH_ATT: 0,
        RUSH_YDS: 0,
        RUSH_TD: 0,
        TGT: 0,
        REC: 0,
        REC_YDS: 0,
        REC_TD: 0,
        TWO_PT: 0,
        FUML: 0,
        FG: 0,
        FGA: 0,
        FG50: 0,
        FG0_19: 0,
        FG20_29: 0,
        FG30_39: 0,
        FG40_49: 0,
        FG50_PLUS: 0,
        FG_MISS: 0,
        XPA: 0,
        XP: 0,
        XP_MISS: 0,
        SACK: 0,
        DST_INT: 0,
        FR: 0,
        FF: 0,
        DST_TD: 0,
        ST_TD: 0,
        ST_FF: 0,
        ST_FR: 0,
        FR_TD: 0,
        SAFETY: 0,
        BLK: 0,
        PTS_ALLOWED: 0,
        PA0: 0,
        PA1_6: 0,
        PA7_13: 0,
        PA14_20: 0,
        PA21_27: 0,
        PA28_34: 0,
        PA35_PLUS: 0,
        FPTS: null,
        ADP: null,
      },
    ],
    batterIdSource: null,
    pitcherIdSource: null,
  },
};

const batterFixture: BatterPlayer = {
  _type: "batter",
  _id: "mlb-batter",
  Name: "Test Batter",
  Team: "CHC",
  PlayerId: "mlb-batter",
  MLBAMID: "1",
  G: 1,
  PA: 1,
  AB: 1,
  H: 1,
  "1B": 1,
  "2B": 0,
  "3B": 0,
  HR: 0,
  R: 0,
  RBI: 0,
  BB: 0,
  IBB: 0,
  SO: 0,
  HBP: 0,
  SF: 0,
  SH: 0,
  GDP: 0,
  SB: 0,
  CS: 0,
  AVG: 1,
  OBP: 1,
  SLG: 1,
  OPS: 1,
  ISO: 0,
  BABIP: 1,
  "wRC+": 100,
  WAR: 0,
  ADP: null,
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
    applyEligibility: vi.fn(),
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
        json: async () => (input.endsWith("/datasets/manifest.json") ? manifestResponse : payloadResponse),
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

  it("does not fetch or re-import when a protected baseline already has eligibility", async () => {
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
          sport: "baseball",
          batters: [batterFixture],
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

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/datasets/manifest.json");
    });
    expect(runProjectionEligibilityImportMock).not.toHaveBeenCalled();
  });

  it("seeds a missing football default when baseball baseline already exists", async () => {
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
          sport: "baseball",
          batters: [batterFixture],
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
    useStoreMock.mockImplementation(() => state);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => ({
        ok: true,
        json: async () =>
          input.endsWith("/datasets/manifest.json")
            ? {
                datasets: [
                  ...manifestResponse.datasets,
                  {
                    slug: "football-historical-2025",
                    name: "2025 Football Prior-Year Baseline",
                    season: 2025,
                    sport: "football" as const,
                    datasetType: "historical-stats" as const,
                    default: true,
                  },
                ],
              }
            : footballPayloadResponse,
      }))
    );

    render(<PublicDatasetBootstrap />);

    await waitFor(() => {
      expect(state.seedProjectionGroup).toHaveBeenCalledTimes(1);
    });
    expect(state.projectionGroups[1]?.sport).toBe("football");
    expect(runProjectionEligibilityImportMock).not.toHaveBeenCalled();
  });

  it("repairs an empty protected football default by fetching it again", async () => {
    const state = createStoreState({
      projectionGroups: [
        {
          id: "public-football-historical-2025",
          name: "2025 Football Prior-Year Stats",
          createdAt: "2026-01-01T00:00:00.000Z",
          source: {
            kind: "public-dataset",
            slug: "football-historical-2025",
            season: 2025,
            datasetType: "historical-stats",
            protected: true,
            seededAt: "2026-03-22T12:00:00.000Z",
          },
          sport: "football",
          batters: [],
          pitchers: [],
          twoWayPlayers: [],
          footballPlayers: [],
          batterIdSource: null,
          pitcherIdSource: null,
        },
      ],
      activeProjectionGroupId: "public-football-historical-2025",
    });
    useStoreMock.mockImplementation(() => state);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => ({
        ok: true,
        json: async () =>
          input.endsWith("/datasets/manifest.json")
            ? {
                datasets: [
                  {
                    slug: "football-historical-2025",
                    name: "2025 Football Prior-Year Baseline",
                    season: 2025,
                    sport: "football" as const,
                    datasetType: "historical-stats" as const,
                    default: true,
                  },
                ],
              }
            : footballPayloadResponse,
      }))
    );

    render(<PublicDatasetBootstrap />);

    await waitFor(() => {
      expect(state.seedProjectionGroup).toHaveBeenCalledTimes(1);
    });
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
          sport: "baseball",
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
    expect(fetchMock).toHaveBeenCalledWith("/datasets/manifest.json");
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
          json: async () => (input.endsWith("/datasets/manifest.json") ? manifestResponse : payloadResponse),
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
