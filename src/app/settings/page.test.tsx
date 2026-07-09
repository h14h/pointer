import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/settings/page";

const replaceMock = vi.fn();
const getSearchParamMock = vi.fn();

// The page imports navigation through the framework seam (which the Next
// build resolves to next/navigation) — mock the seam itself.
vi.mock("@/lib/routing/adapter", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({
    get: getSearchParamMock,
  }),
}));

vi.mock("@/store", () => ({
  useStore: () => ({
    hasHydrated: true,
    activeLeagueId: "league-1",
    leagues: [{ id: "league-1", name: "Test League", sport: "baseball" }],
  }),
}));

// /settings is a legacy URL: it now redirects section queries onto the
// active league's workspace tabs (config/intel) or the home league list.
describe("settings route legacy redirects", () => {
  afterEach(() => {
    cleanup();
    replaceMock.mockReset();
    getSearchParamMock.mockReset();
  });

  it("defaults to the active league's config tab", async () => {
    getSearchParamMock.mockReturnValue(null);
    render(<SettingsPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/league/league-1/config"),
    );
  });

  it("sends scoring/roster/draft sections to config", async () => {
    getSearchParamMock.mockReturnValue("roster");
    render(<SettingsPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/league/league-1/config"),
    );
  });

  it("sends projections to the intel tab", async () => {
    getSearchParamMock.mockReturnValue("projections");
    render(<SettingsPage />);

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/league/league-1/intel"),
    );
  });

  it("sends the leagues section home", async () => {
    getSearchParamMock.mockReturnValue("leagues");
    render(<SettingsPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });
});
