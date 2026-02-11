import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import SettingsPage from "@/app/settings/page";

const getSearchParamMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: getSearchParamMock,
  }),
}));

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock("@/components/CsvUpload", () => ({
  CsvUpload: () => <div data-testid="upload" />,
}));

vi.mock("@/components/settings/ScoringSection", () => ({
  ScoringSection: () => <div>Scoring section</div>,
}));

vi.mock("@/components/settings/RosterSection", () => ({
  RosterSection: () => <div>Roster section</div>,
}));

vi.mock("@/components/settings/DraftSection", () => ({
  DraftSection: () => <div>Draft section</div>,
}));

vi.mock("@/components/settings/SettingsLayout", () => ({
  SettingsLayout: ({
    activeSection,
    children,
  }: {
    activeSection: string;
    children: ReactNode;
  }) => (
    <div>
      <span data-testid="active-section">{activeSection}</span>
      {children}
    </div>
  ),
}));

describe("settings route section query", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults to scoring when section is missing", () => {
    getSearchParamMock.mockReturnValue(null);
    render(<SettingsPage />);

    expect(screen.getByTestId("active-section")).toHaveTextContent("scoring");
    expect(screen.getByText("Scoring section")).toBeInTheDocument();
  });

  it("renders roster when section=roster", () => {
    getSearchParamMock.mockReturnValue("roster");
    render(<SettingsPage />);

    expect(screen.getByTestId("active-section")).toHaveTextContent("roster");
    expect(screen.getByText("Roster section")).toBeInTheDocument();
  });

  it("falls back to scoring for invalid section", () => {
    getSearchParamMock.mockReturnValue("invalid");
    render(<SettingsPage />);

    expect(screen.getByTestId("active-section")).toHaveTextContent("scoring");
    expect(screen.getByText("Scoring section")).toBeInTheDocument();
  });
});
