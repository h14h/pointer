import { describe, expect, it } from "bun:test";
import {
  computeHitterEligibility,
  computePitcherEligibility,
  emptyPositionGames,
} from "./eligibility";

describe("eligibility", () => {
  it("marks hitter eligible at 20+ games", () => {
    const games = emptyPositionGames();
    games["3B"] = 20;
    const eligibility = computeHitterEligibility(games, 2025);
    expect(eligibility.eligiblePositions).toContain("3B");
  });

  it("marks hitter eligible at 25% threshold", () => {
    const games = emptyPositionGames();
    games.C = 5;
    const eligibility = computeHitterEligibility(games, 2025);
    expect(eligibility.eligiblePositions).toContain("C");
  });

  it("marks SP/RP eligibility correctly", () => {
    const eligibility = computePitcherEligibility({ G: 13, GS: 5 }, 2025);
    expect(eligibility.isSP).toBe(true);
    expect(eligibility.isRP).toBe(true);
  });

  it("uses 25% ratio thresholds for SP/RP", () => {
    const spEligibility = computePitcherEligibility({ G: 4, GS: 1 }, 2025);
    expect(spEligibility.isSP).toBe(true);

    const rpEligibility = computePitcherEligibility({ G: 4, GS: 3 }, 2025);
    expect(rpEligibility.isRP).toBe(true);
  });
});
