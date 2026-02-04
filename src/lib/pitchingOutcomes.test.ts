import { describe, expect, it } from "bun:test";
import {
  estimateCompleteGames,
  estimateShutouts,
  resolveCompleteGames,
  resolveShutouts,
} from "./pitchingOutcomes";

describe("pitching outcome estimation", () => {
  it("honors provided CG values", () => {
    const resolved = resolveCompleteGames({
      CG: 2,
      GS: 28,
      IP: 190,
      ERA: 3.1,
    });

    expect(resolved).toBe(2);
  });

  it("honors provided ShO values", () => {
    const resolved = resolveShutouts({
      ShO: 1,
      CG: 2,
      GS: 28,
      IP: 190,
      ERA: 3.1,
    });

    expect(resolved).toBe(1);
  });

  it("clamps CG to GS", () => {
    const estimate = estimateCompleteGames({ GS: 10, IP: 90, ERA: 1.5 });
    expect(estimate).toBeLessThanOrEqual(10);
  });

  it("does not estimate ShO above CG", () => {
    const estimate = estimateShutouts({ GS: 30, IP: 210, ERA: 2.1, CG: 1 });
    expect(estimate).toBeLessThanOrEqual(1);
  });

  it("produces non-zero estimates for high-IP starters", () => {
    const cg = estimateCompleteGames({ GS: 10, IP: 90, ERA: 2.5 });
    const sho = estimateShutouts({ GS: 10, IP: 90, ERA: 2.5, CG: Math.max(cg, 0.5) });
    expect(cg).toBeGreaterThan(0);
    expect(sho).toBeGreaterThanOrEqual(0);
  });
});
