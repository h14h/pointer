import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { Header } from "@/components/Header";

const useStoreMock = vi.fn();
const usePathnameMock = vi.fn();

vi.mock("@/store", () => ({
  useStore: () => useStoreMock(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

describe("Header settings navigation", () => {
  function mockStore() {
    useStoreMock.mockReturnValue({
      isDraftMode: false,
      setDraftMode: vi.fn(),
      leagues: [
        {
          id: "league-1",
          name: "My League",
          leagueSettings: {
            leagueSize: 12,
            teamNames: Array.from({ length: 12 }, (_, index) => `Team ${index + 1}`),
            roster: {
              positions: {
                C: 1,
                "1B": 1,
                "2B": 1,
                "3B": 1,
                SS: 1,
                LF: 0,
                CF: 0,
                RF: 0,
                DH: 0,
                CI: 0,
                MI: 0,
                IF: 0,
                OF: 3,
                UTIL: 1,
                SP: 0,
                RP: 0,
                P: 7,
                IL: 0,
                NA: 0,
              },
              bench: 3,
            },
          },
          draftState: { format: "snake", draftedByTeam: {}, keeperByTeam: {}, keeperSlotByPlayer: {}, pickIndex: 0, history: [] },
          scoringSettings: {
            name: "Default",
            batting: { R: 1, H: 0, "1B": 1, "2B": 2, "3B": 3, HR: 4, RBI: 1, SB: 1, CS: -1, BB: 1, SO: -1, HBP: 1, SF: 0, GDP: 0 },
            pitching: { IP: 3, W: 5, L: -5, QS: 3, CG: 0, ShO: 0, SV: 5, BS: -3, HLD: 2, SO: 1, H: -1, ER: -2, HR: -1, BB: -1, HBP: -1 },
          },
          updatedAt: Date.now(),
        },
      ],
      activeLeagueId: "league-1",
      setActiveLeague: vi.fn(),
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
    });
  }

  afterEach(() => {
    cleanup();
  });

  it("renders the projections dropdown and settings cog", () => {
    usePathnameMock.mockReturnValue("/");
    mockStore();
    render(<Header />);

    expect(screen.getAllByRole("button", { name: /2025 Leaders/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /My League/i })).toHaveLength(2);
    expect(screen.getAllByLabelText("Draft Mode")).toHaveLength(2);
    expect(screen.getAllByLabelText("Settings")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Open settings navigation" })).toBeInTheDocument();
  });

  it("links back to the leaderboard and applies active styles on the settings page", () => {
    usePathnameMock.mockReturnValue("/settings");
    mockStore();
    render(<Header />);

    const settingsLink = screen.getByLabelText("Settings");
    expect(settingsLink).toHaveAttribute("href", "/");
    expect(settingsLink).toHaveAttribute("title", "Back to leaderboard");
    expect(settingsLink.className).toContain("bg-[var(--color-accent)]");
    expect(screen.getByRole("button", { name: "Open settings navigation" }).className).toContain(
      "color-mix"
    );
  });

  it("opens the projections menu with a manage link", async () => {
    const user = userEvent.setup();
    usePathnameMock.mockReturnValue("/");
    mockStore();
    render(<Header />);

    await user.click(screen.getAllByRole("button", { name: /2025 Leaders/i })[0]!);

    expect(screen.getByText("Steamer")).toBeInTheDocument();
    expect(screen.getByText("Built-in")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage Projections..." })).toHaveAttribute(
      "href",
      "/settings?section=projections"
    );
  });

  it("opens the mobile navigation drawer with settings sections on the settings page", async () => {
    const user = userEvent.setup();
    usePathnameMock.mockReturnValue("/settings");
    mockStore();
    render(<Header activeSettingsSection="roster" />);

    await user.click(screen.getByRole("button", { name: "Open settings navigation" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(screen.getByText("Settings Sections")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Roster/i })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Manage Projections" })).not.toBeInTheDocument();
  });
});
