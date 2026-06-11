import { describe, test, expect } from "bun:test";
import { assignTiers, summarizeTierSupply, type TierInput } from "./index";

function pool(points: number[]): TierInput[] {
  return points.map((p, i) => ({ id: `p${i}`, points: p }));
}

/**
 * A realistic 50-player pool: six clumps with small intra-clump steps and
 * clear shelves (19–28 points) between them. Deterministic by construction.
 */
function realisticPool(): TierInput[] {
  const groups = [
    { size: 4, start: 400, step: 4 },
    { size: 6, start: 360, step: 3 },
    { size: 8, start: 320, step: 3 },
    { size: 10, start: 280, step: 2 },
    { size: 10, start: 240, step: 2 },
    { size: 12, start: 200, step: 2 },
  ];
  const points: number[] = [];
  for (const group of groups) {
    for (let i = 0; i < group.size; i++) {
      points.push(group.start - i * group.step);
    }
  }
  return pool(points);
}

describe("assignTiers", () => {
  test("empty input yields an empty map", () => {
    expect(assignTiers([]).size).toBe(0);
  });

  test("single player lands in tier 1", () => {
    const tiers = assignTiers([{ id: "solo", points: 312 }]);
    expect(tiers.size).toBe(1);
    expect(tiers.get("solo")).toBe(1);
  });

  test("all-equal points collapse into a single tier", () => {
    const tiers = assignTiers(pool([100, 100, 100, 100, 100]));
    expect(new Set(tiers.values())).toEqual(new Set([1]));
  });

  test("uniform descent with no natural shelf stays one tier", () => {
    const tiers = assignTiers(pool([100, 99, 98, 97, 96, 95, 94, 93]));
    expect(new Set(tiers.values())).toEqual(new Set([1]));
  });

  test("breaks on a clear shelf between clumps", () => {
    // 3 tight clumps separated by 20+ point cliffs
    const tiers = assignTiers(
      pool([200, 198, 197, 170, 169, 167, 140, 139, 138])
    );
    expect(tiers.get("p0")).toBe(1);
    expect(tiers.get("p2")).toBe(1);
    expect(tiers.get("p3")).toBe(2);
    expect(tiers.get("p5")).toBe(2);
    expect(tiers.get("p6")).toBe(3);
    expect(tiers.get("p8")).toBe(3);
  });

  test("minTierSize keeps a lone elite player attached to the tier below", () => {
    const points = [300, 250, 249, 248, 247];
    // Default minTierSize = 2: the solo top player cannot close a tier alone.
    const defaults = assignTiers(pool(points));
    expect(defaults.get("p0")).toBe(1);
    expect(defaults.get("p1")).toBe(1);

    // minTierSize = 1 lets the elite player stand alone.
    const loose = assignTiers(pool(points), { minTierSize: 1 });
    expect(loose.get("p0")).toBe(1);
    expect(loose.get("p1")).toBe(2);
  });

  test("maxTiers caps the count and collapses overflow into the last tier", () => {
    // 10 pairs separated by 100-point cliffs → 10 natural tiers.
    const points: number[] = [];
    for (let g = 0; g < 10; g++) {
      const top = 2000 - g * 101;
      points.push(top, top - 1);
    }
    const tiers = assignTiers(pool(points));
    const values = [...tiers.values()];
    expect(Math.max(...values)).toBe(8); // default cap
    // groups 8, 9, 10 (six players) all collapse into tier 8
    expect(values.filter((t) => t === 8)).toHaveLength(6);

    const capped = assignTiers(pool(points), { maxTiers: 3 });
    expect(Math.max(...[...capped.values()])).toBe(3);
  });

  test("tiers are monotone non-decreasing in rank order", () => {
    const players = realisticPool();
    const tiers = assignTiers(players);
    let last = 1;
    for (const player of players) {
      const tier = tiers.get(player.id);
      expect(tier).toBeDefined();
      expect(tier as number).toBeGreaterThanOrEqual(last);
      last = tier as number;
    }
  });

  test("a realistic 50-player pool yields a sensible 4-7 tier count", () => {
    const players = realisticPool();
    expect(players).toHaveLength(50);
    const tiers = assignTiers(players);
    const tierCount = new Set(tiers.values()).size;
    expect(tierCount).toBeGreaterThanOrEqual(4);
    expect(tierCount).toBeLessThanOrEqual(7);
    // every tier respects the default minimum size
    const sizes = new Map<number, number>();
    for (const tier of tiers.values()) {
      sizes.set(tier, (sizes.get(tier) ?? 0) + 1);
    }
    for (const size of sizes.values()) {
      expect(size).toBeGreaterThanOrEqual(2);
    }
  });

  test("is deterministic across calls", () => {
    const players = realisticPool();
    const a = assignTiers(players);
    const b = assignTiers(players);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
});

describe("summarizeTierSupply", () => {
  test("empty input yields no rows", () => {
    expect(summarizeTierSupply([])).toEqual([]);
  });

  test("counts totals and remaining per tier, sorted ascending", () => {
    const rows = summarizeTierSupply([
      { id: "a", points: 200, available: false },
      { id: "b", points: 198, available: true },
      { id: "c", points: 197, available: true },
      { id: "d", points: 160, available: false },
      { id: "e", points: 159, available: false },
      { id: "f", points: 158, available: true },
    ]);
    expect(rows).toEqual([
      { tier: 1, total: 3, remaining: 2 },
      { tier: 2, total: 3, remaining: 1 },
    ]);
  });

  test("tiering uses the full printed pool, not just available players", () => {
    const drafted = summarizeTierSupply([
      { id: "a", points: 200, available: false },
      { id: "b", points: 198, available: false },
      { id: "c", points: 150, available: true },
      { id: "d", points: 149, available: true },
    ]);
    // tier 1 still exists even though it is fully drafted
    expect(drafted[0]).toEqual({ tier: 1, total: 2, remaining: 0 });
    expect(drafted[1]).toEqual({ tier: 2, total: 2, remaining: 2 });
  });
});
