import { describe, expect, it } from "vitest";
import { resolveSettingsSection } from "@/components/settings/types";

describe("resolveSettingsSection", () => {
  it("defaults to scoring for missing or invalid section", () => {
    expect(resolveSettingsSection(null)).toBe("scoring");
    expect(resolveSettingsSection("unknown")).toBe("scoring");
  });

  it("returns valid section values", () => {
    expect(resolveSettingsSection("scoring")).toBe("scoring");
    expect(resolveSettingsSection("roster")).toBe("roster");
    expect(resolveSettingsSection("draft")).toBe("draft");
  });
});
