import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectionsSection } from "@/components/settings/ProjectionsSection";

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

function createStoreState() {
  return {
    projectionGroups: [
      {
        id: "public-historical-2025",
        name: "2025 Prior-Year Stats",
        createdAt: "2026-03-22T00:00:00.000Z",
        source: {
          kind: "public-dataset",
          slug: "historical-2025",
          season: 2025,
          datasetType: "historical-stats",
          protected: true,
          seededAt: "2026-03-22T00:00:00.000Z",
        },
        batters: [],
        pitchers: [],
        twoWayPlayers: [],
        batterIdSource: "MLBAMID",
        pitcherIdSource: "MLBAMID",
        eligibilityImportSeason: 2025,
      },
      {
        id: "upload-1",
        name: "Steamer",
        createdAt: "2026-03-22T00:00:00.000Z",
        source: { kind: "upload" },
        batters: [],
        pitchers: [],
        twoWayPlayers: [],
        batterIdSource: "MLBAMID",
        pitcherIdSource: "MLBAMID",
        eligibilityImportSeason: 2025,
      },
    ],
    activeProjectionGroupId: "public-historical-2025",
    setActiveProjectionGroup: vi.fn(),
    renameProjectionGroup: vi.fn(),
    removeProjectionGroup: vi.fn(),
    setProjectionGroupEligibilityImportSeason: vi.fn(),
    applyEligibility: vi.fn(),
  };
}

describe("ProjectionsSection", () => {
  const onOpenUpload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useStoreMock.mockReturnValue(createStoreState());
    runProjectionEligibilityImportMock.mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows built-in and uploaded groups with the expected actions", () => {
    render(<ProjectionsSection onOpenUpload={onOpenUpload} />);

    expect(screen.getByText("2025 Leaders")).toBeInTheDocument();
    expect(screen.getByText("Steamer")).toBeInTheDocument();
    expect(screen.getAllByText("Built-in")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload Projections" })).toBeInTheDocument();
    expect(screen.getByText("Delete Projection Group")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Group" })).toBeInTheDocument();
  });

  it("opens the upload flow from the section", async () => {
    const user = userEvent.setup();
    render(<ProjectionsSection onOpenUpload={onOpenUpload} />);

    await user.click(screen.getByRole("button", { name: "Upload Projections" }));

    expect(onOpenUpload).toHaveBeenCalledTimes(1);
  });

  it("switches the active group", async () => {
    const user = userEvent.setup();
    const state = createStoreState();
    useStoreMock.mockReturnValue(state);
    render(<ProjectionsSection onOpenUpload={onOpenUpload} />);

    await user.click(screen.getByRole("button", { name: "Use" }));

    expect(state.setActiveProjectionGroup).toHaveBeenCalledWith("upload-1");
  });

  it("runs retroactive eligibility import for a group", async () => {
    const user = userEvent.setup();
    render(<ProjectionsSection onOpenUpload={onOpenUpload} />);

    await user.click(screen.getAllByRole("button", { name: "Import Eligibility" })[0]);

    await waitFor(() => {
      expect(runProjectionEligibilityImportMock).toHaveBeenCalled();
    });
  });

  it("confirms deletion for uploaded groups from the danger area", async () => {
    const user = userEvent.setup();
    const state = createStoreState();
    useStoreMock.mockReturnValue(state);
    render(<ProjectionsSection onOpenUpload={onOpenUpload} />);

    await user.click(screen.getByRole("button", { name: "Delete Group" }));
    expect(screen.getByRole("button", { name: "Confirm Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));
    expect(state.removeProjectionGroup).toHaveBeenCalledWith("upload-1");
  });
});
