import { describe, expect, it } from "bun:test";
import { isValidBaseballIp, normalizeIp } from "./ipMath";

describe("ipMath", () => {
  it("normalizes .0", () => {
    const info = normalizeIp(10.0);
    expect(info.valid).toBe(true);
    expect(info.outs).toBe(30);
    expect(info.innings).toBe(10);
  });

  it("normalizes .1", () => {
    const info = normalizeIp(10.1);
    expect(info.valid).toBe(true);
    expect(info.outs).toBe(31);
    expect(info.innings).toBeCloseTo(10.333333, 5);
  });

  it("normalizes .2", () => {
    const info = normalizeIp(10.2);
    expect(info.valid).toBe(true);
    expect(info.outs).toBe(32);
    expect(info.innings).toBeCloseTo(10.666666, 5);
  });

  it("rejects invalid fractions", () => {
    expect(isValidBaseballIp(10.3)).toBe(false);
    expect(isValidBaseballIp(10.19)).toBe(false);
    expect(isValidBaseballIp(-1)).toBe(false);
  });
});
