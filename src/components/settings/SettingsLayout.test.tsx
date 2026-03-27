import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

describe("SettingsLayout", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the desktop sidebar with active section state", () => {
    render(
      <SettingsLayout activeSection="roster">
        <div>Settings content</div>
      </SettingsLayout>
    );

    expect(screen.getByText("Settings content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Roster/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Scoring/i })).toHaveAttribute(
      "href",
      "/settings?section=scoring"
    );
  });
});
