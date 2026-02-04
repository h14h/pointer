import { describe, expect, it } from "bun:test";
import { estimateQualityStarts, resolveQualityStarts } from "./qualityStarts";

describe("quality start estimation", () => {
  it("returns 0 when GS is 0", () => {
    const estimate = estimateQualityStarts({ GS: 0, IP: 0, ERA: 3.5, W: 0 });
    expect(estimate).toBe(0);
  });

  it("honors provided QS values", () => {
    const resolved = resolveQualityStarts({
      QS: 14,
      GS: 28,
      IP: 170,
      ERA: 3.1,
      W: 12,
    });

    expect(resolved).toBe(14);
  });

  it("estimates QS when missing using GS, IP, ERA, and W", () => {
    const estimate = estimateQualityStarts({ GS: 10, IP: 65, ERA: 9, W: 0 });
    expect(estimate).toBeCloseTo(1.3, 5);
  });

  it("returns 0 when ERA is missing", () => {
    const resolved = resolveQualityStarts({
      QS: 0,
      GS: 12,
      IP: 70,
      ERA: 0,
      W: 6,
    });

    expect(resolved).toBe(0);
  });
});
