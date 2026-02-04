import { describe, expect, it } from "bun:test";
import { estimateQualityStarts, resolveQualityStarts } from "./pitchingOutcomes";

describe("quality start estimation", () => {
  it("returns 0 when GS is 0", () => {
    const estimate = estimateQualityStarts({ GS: 0, IP: 0, ERA: 3.5, W: 0 });
    expect(estimate).toBe(0);
  });

  it("returns 0 when GS is below the QS threshold", () => {
    const estimate = estimateQualityStarts({ GS: 5, IP: 60, ERA: 3.5, W: 4 });
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

  it("estimates QS higher with more innings per start", () => {
    const lowIp = estimateQualityStarts({ GS: 10, IP: 50, ERA: 3.5, W: 5 });
    const highIp = estimateQualityStarts({ GS: 10, IP: 70, ERA: 3.5, W: 5 });
    expect(highIp).toBeGreaterThan(lowIp);
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
