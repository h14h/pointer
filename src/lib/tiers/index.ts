// Natural-gap tiering over projected points. A tier break happens where the
// drop between consecutive players is meaningfully larger than the drops
// still ahead of the cursor — "the shelf falls away". Deterministic: no
// clock, no randomness, stable for equal points.

export type TierInput = { id: string; points: number };

export type TierOptions = {
  /** Hard cap on tier count; overflow collapses into the last tier. */
  maxTiers?: number;
  /** A tier must hold at least this many players before it can close. */
  minTierSize?: number;
};

export type TierSupplyInput = TierInput & { available: boolean };

export type TierSupplyRow = { tier: number; total: number; remaining: number };

const DEFAULT_MAX_TIERS = 8;
const DEFAULT_MIN_TIER_SIZE = 2;

/**
 * A gap starts a new tier when it exceeds the mean of the gaps still
 * remaining (itself included) by this factor. Tuned so a realistic
 * ~50-player pool lands around 4–7 tiers.
 */
const GAP_BREAK_FACTOR = 1.6;

/**
 * Assigns a 1-based tier to every player, walking the pool in descending
 * points order and breaking on outsized gaps.
 *
 * - Empty input → empty map.
 * - All-equal points (no gaps) → everyone in tier 1.
 * - Single player → tier 1.
 */
export function assignTiers(
  players: TierInput[],
  opts?: TierOptions
): Map<string, number> {
  const maxTiers = Math.max(1, Math.floor(opts?.maxTiers ?? DEFAULT_MAX_TIERS));
  const minTierSize = Math.max(
    1,
    Math.floor(opts?.minTierSize ?? DEFAULT_MIN_TIER_SIZE)
  );

  const tiers = new Map<string, number>();
  if (players.length === 0) return tiers;

  // Stable sort: equal points keep input order, so output is deterministic.
  const sorted = [...players].sort((a, b) => b.points - a.points);

  // gaps[i] is the points drop between sorted[i] and sorted[i + 1].
  const gapCount = sorted.length - 1;
  const gaps: number[] = new Array(gapCount);
  for (let i = 0; i < gapCount; i++) {
    gaps[i] = sorted[i].points - sorted[i + 1].points;
  }

  // Suffix sums make mean(remaining gaps) O(1) at each boundary.
  const suffixSum: number[] = new Array(gapCount + 1).fill(0);
  for (let i = gapCount - 1; i >= 0; i--) {
    suffixSum[i] = suffixSum[i + 1] + gaps[i];
  }

  let tier = 1;
  let tierSize = 0;

  for (let i = 0; i < sorted.length; i++) {
    tiers.set(sorted[i].id, tier);
    tierSize += 1;

    if (i >= gapCount) break; // last player — no boundary after it

    const remaining = gapCount - i;
    const meanRemaining = suffixSum[i] / remaining;
    const isNaturalBreak = gaps[i] > meanRemaining * GAP_BREAK_FACTOR;

    if (isNaturalBreak && tierSize >= minTierSize && tier < maxTiers) {
      tier += 1;
      tierSize = 0;
    }
  }

  return tiers;
}

/**
 * Tiers the full printed pool (available or not) and reports, per tier, how
 * many players were printed and how many are still on the board. Rows come
 * back sorted by tier ascending.
 */
export function summarizeTierSupply(
  players: TierSupplyInput[],
  opts?: TierOptions
): TierSupplyRow[] {
  const tierById = assignTiers(players, opts);
  const rowByTier = new Map<number, TierSupplyRow>();

  for (const player of players) {
    const tier = tierById.get(player.id);
    if (tier === undefined) continue;
    const row = rowByTier.get(tier) ?? { tier, total: 0, remaining: 0 };
    row.total += 1;
    if (player.available) row.remaining += 1;
    rowByTier.set(tier, row);
  }

  return [...rowByTier.values()].sort((a, b) => a.tier - b.tier);
}
