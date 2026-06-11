import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResetDraftControl } from "./ResetDraftControl";
import type { useStore as UseStore } from "@/store";

const resetDraftSpy = vi.fn();

vi.mock("@/store", () => ({
  useStore: (selector?: (state: { resetDraft: () => void }) => unknown) =>
    selector ? selector({ resetDraft: resetDraftSpy }) : { resetDraft: resetDraftSpy },
}));

// Keep the mock's shape honest against the real store's selector signature
void (undefined as unknown as typeof UseStore);

describe("ResetDraftControl (draft room)", () => {
  afterEach(() => {
    cleanup();
    resetDraftSpy.mockReset();
  });

  it("confirms through the dialog before resetting", async () => {
    const user = userEvent.setup();
    render(<ResetDraftControl />);

    await user.click(screen.getByRole("button", { name: /reset draft/i }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText(/keeper assignments stay/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset Draft" }));
    expect(resetDraftSpy).toHaveBeenCalledTimes(1);
  });

  it("cancelling leaves the draft untouched", async () => {
    const user = userEvent.setup();
    render(<ResetDraftControl />);

    await user.click(screen.getByRole("button", { name: /reset draft/i }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(resetDraftSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
