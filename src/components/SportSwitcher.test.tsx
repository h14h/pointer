import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SportSwitcher } from "@/components/SportSwitcher";

const useStoreMock = vi.fn();

vi.mock("@/store", () => ({
  useStore: (selector?: (state: ReturnType<typeof useStoreMock>) => unknown) => {
    const state = useStoreMock();
    return selector ? selector(state) : state;
  },
}));

describe("SportSwitcher", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function mockStore(activeSport: "baseball" | "football") {
    const switchSport = vi.fn();
    useStoreMock.mockReturnValue({
      leagues: [
        { id: "league-1", name: "Ball Four", sport: "baseball" },
        { id: "league-2", name: "Gridiron", sport: "football" },
      ],
      activeLeagueId: activeSport === "baseball" ? "league-1" : "league-2",
      switchSport,
    });
    return { switchSport };
  }

  it("marks the active league's sport as pressed", () => {
    mockStore("football");
    render(<SportSwitcher />);

    expect(screen.getByRole("button", { name: "Football" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Baseball" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("switches sport when the inactive option is clicked", async () => {
    const { switchSport } = mockStore("baseball");
    const user = userEvent.setup();
    render(<SportSwitcher />);

    await user.click(screen.getByRole("button", { name: "Football" }));
    expect(switchSport).toHaveBeenCalledWith("football");
  });

  it("does not re-switch when the active option is clicked", async () => {
    const { switchSport } = mockStore("baseball");
    const user = userEvent.setup();
    render(<SportSwitcher />);

    await user.click(screen.getByRole("button", { name: "Baseball" }));
    expect(switchSport).not.toHaveBeenCalled();
  });
});
