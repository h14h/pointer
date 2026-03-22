import { describe, expect, it } from "bun:test";
import {
  buildPlayerSearchText,
  matchesPlayerSearch,
  normalizePlayerSearchText,
} from "@/lib/playerSearch";

describe("playerSearch", () => {
  it("normalizes accents for search text", () => {
    expect(normalizePlayerSearchText("José Berríos TOR")).toBe("jose berrios tor");
  });

  it("builds combined player search text", () => {
    expect(buildPlayerSearchText({ Name: "José Berríos", Team: "TOR" })).toBe(
      "jose berrios tor"
    );
  });

  it("matches accent-insensitive player search queries", () => {
    expect(matchesPlayerSearch({ Name: "José Berríos", Team: "TOR" }, "jose berrios")).toBe(true);
    expect(matchesPlayerSearch({ Name: "José Berríos", Team: "TOR" }, "TOR")).toBe(true);
    expect(matchesPlayerSearch({ Name: "José Berríos", Team: "TOR" }, "walker")).toBe(false);
  });
});
