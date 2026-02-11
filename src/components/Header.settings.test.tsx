import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
  const onOpenUpload = vi.fn();

  function mockStore() {
    useStoreMock.mockReturnValue({
      isDraftMode: false,
      setDraftMode: vi.fn(),
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
      draftState: { draftedByTeam: {}, keeperByTeam: {}, activeTeamIndex: 0 },
      setActiveTeamIndex: vi.fn(),
      advanceActiveTeam: vi.fn(),
      resetDraft: vi.fn(),
      clearAllData: vi.fn(),
    });
  }

  afterEach(() => {
    cleanup();
  });

  it("renders a settings cog link and removes the scoring button", () => {
    usePathnameMock.mockReturnValue("/");
    mockStore();
    render(<Header onOpenUpload={onOpenUpload} />);

    expect(screen.queryByRole("button", { name: "Scoring" })).toBeNull();
    const settingsLink = screen.getByLabelText("Settings");
    expect(settingsLink).toHaveAttribute("href", "/settings?section=scoring");
  });

  it("applies active styles on the settings page", () => {
    usePathnameMock.mockReturnValue("/settings");
    mockStore();
    render(<Header onOpenUpload={onOpenUpload} />);

    const settingsLink = screen.getByLabelText("Settings");
    expect(settingsLink.className).toContain("bg-[#dc2626]");
  });
});
