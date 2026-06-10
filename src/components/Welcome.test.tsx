import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Welcome } from "@/components/Welcome";

const useStoreMock = vi.fn();

vi.mock("@/store", () => ({
  useStore: (selector?: (state: ReturnType<typeof useStoreMock>) => unknown) => {
    const state = useStoreMock();
    return selector ? selector(state) : state;
  },
}));

describe("Welcome", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function mockStore() {
    const completeOnboarding = vi.fn();
    useStoreMock.mockReturnValue({ completeOnboarding });
    return { completeOnboarding };
  }

  it("offers both sports as primary choices", () => {
    mockStore();
    render(<Welcome />);

    expect(screen.getByRole("heading", { name: "Pointer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baseball/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Football/ })).toBeInTheDocument();
  });

  it("completes onboarding with the chosen sport", async () => {
    const { completeOnboarding } = mockStore();
    const user = userEvent.setup();
    render(<Welcome />);

    await user.click(screen.getByRole("button", { name: /Football/ }));
    expect(completeOnboarding).toHaveBeenCalledWith("football");

    await user.click(screen.getByRole("button", { name: /Baseball/ }));
    expect(completeOnboarding).toHaveBeenCalledWith("baseball");
  });
});
