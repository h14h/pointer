# Pitching Outcomes

## Purpose

Estimates pitching outcome stats (quality starts, complete games, shutouts) using linear regression models when actual values are not available in projection data. Provides resolution functions that prefer actual stats and fall back to estimation.

## Source Files

- `src/lib/pitchingOutcomes.ts`
- `src/lib/qualityStarts.ts` — re-exports `estimateQualityStarts` and `resolveQualityStarts` from `pitchingOutcomes.ts`

## Dependencies

- [Types](types.md) — `PitcherStats`
- [Utilities](utilities.md) — `normalizeIp`

## Dependents

- [Scoring](scoring.md) — uses `resolveQualityStarts`, `resolveCompleteGames`, `resolveShutouts` in point calculation
- [Leaderboard](leaderboard.md) — uses resolve functions for display columns

## Types

### `PitchingOutcomeParams`

35 tuning parameters for the estimation models. Controls regression coefficients, IP adjustment factors, ERA blending weights, and ramp thresholds.

### `QsFilterParams`

9 filter parameters for quality start prediction filtering.

## API Reference

### Resolution Functions

These functions prefer actual stat values (if > 0) and fall back to estimation.

#### `resolveQualityStarts(stats: Pick<PitcherStats, "QS"|"GS"|"G"|"IP"|"ERA"|"W"|"FIP"|"WHIP"|"K/9"|"BB/9">, useBaseballIp = false): number`

Returns `stats.QS` if > 0. Otherwise validates that GS > 0, IP > 0, and ERA > 0, then delegates to `estimateQualityStarts`.

#### `resolveCompleteGames(stats, useBaseballIp = false): number`

Returns `stats.CG` if > 0. Otherwise validates inputs and delegates to `estimateCompleteGames`.

#### `resolveShutouts(stats, useBaseballIp = false): number`

Returns `stats.ShO` if > 0. Otherwise validates inputs and delegates to `estimateShutouts`. If CG is not available, estimates CG first, then estimates ShO using that estimated CG value.

### Estimation Functions

Linear regression models that estimate pitching outcomes from available stats.

#### `estimateQualityStarts(input: {GS, IP, G?, ERA, W, FIP?, WHIP?, "K/9"?, "BB/9"?}, params?, useBaseballIp = false): number`

Estimates quality starts using linear regression.

**Guard clauses:** Returns 0 if GS <= 0, IP <= 0, ERA <= 0, or GS < 6.

**Calculation:**
```
appearances = G ?? GS
reliefApps = max(appearances - GS, 0)
adjIP = IP - reliefApps * 1.81

estimate = 1.6601858118151562
         + (-0.6387303455623031 * GS)
         + (0.1952732531471503 * adjIP)
         + (-0.5647520638483603 * ERA)

return max(estimate, 0)
```

#### `estimateCompleteGames(input: {GS, IP, G?, ERA, FIP?, WHIP?, "K/9"?, "BB/9"?}, params?, useBaseballIp = false): number`

Estimates complete games using linear regression.

**Guard clauses:** Same as quality starts.

**Calculation:**
```
appearances = G ?? GS
reliefApps = max(appearances - GS, 0)
adjIP = IP - reliefApps * 1.59

estimate = 0.0913277786691081
         + (-0.056865541289444044 * GS)
         + (0.011711275081015677 * adjIP)
         + (-0.0193119643732167 * ERA)

return max(estimate, 0)
```

#### `estimateShutouts(input: {GS, IP, G?, ERA, CG, FIP?, WHIP?, "K/9"?, "BB/9"?}, params?, useBaseballIp = false): number`

Estimates shutouts using linear regression.

**Guard clauses:** Same as quality starts.

**Calculation:**
```
appearances = G ?? GS
reliefApps = max(appearances - GS, 0)
adjIP = IP - reliefApps * 1.62

estimate = 0.06309944584999562
         + (-0.0223845818844781 * GS)
         + (0.004565597329477387 * adjIP)
         + (-0.011101129116249924 * ERA)

return max(estimate, 0)
```

**Note:** The `CG` parameter is accepted in the input but voided (`void input.CG`) — it is not used in the current regression model.

#### `predictHasQualityStarts(input, params?, filter?): boolean`

Simple heuristic: returns `input.GS >= 6`. The `params` and `filter` arguments are accepted but voided (not used in current implementation).

## Constants

### `DEFAULT_PITCHING_OUTCOME_PARAMS`

All 35 default parameter values for the estimation models.

### `DEFAULT_QS_FILTER_PARAMS`

All 9 default filter parameter values.

## Internal Functions

### `poissonCdf(lambda: number, maxK: number): number`

Computes the cumulative Poisson distribution P(X <= maxK) for a given lambda.

### `ipRamp(avgIpPerStart: number, minIp: number, fullIp: number): number`

Linear ramp function from 0 to 1 based on average IP per start. Returns 0 below `minIp`, 1 above `fullIp`, linear interpolation between.

### `ipRampPiecewise(...): number`

Two-segment ramp with a midpoint. Provides more control over the transition shape.

### `adjustedInningsPitched(IP: number, G: number, GS: number, reliefIpPerAppearance: number, useBaseballIp: boolean): number`

Adjusts total IP by subtracting estimated relief innings. Relief apps = `max(G - GS, 0)`. If `useBaseballIp` is true, normalizes IP first.

### `effectiveEra(input, params): number`

Blends ERA with FIP (if available) and adjusts for WHIP, K/9, and BB/9. Returns a minimum of 0.5.

### `qsProbabilityPerStart(input, params): number`

Calculates per-start quality start probability using Poisson CDF based on effective ERA.

## Edge Cases

- **GS < 6:** All estimation functions return 0 — not enough starts to produce a meaningful estimate.
- **Relief IP adjustment:** Each model uses a different relief IP factor (QS: 1.81, CG: 1.59, ShO: 1.62) to subtract estimated relief innings from total IP.
- **Appearances fallback:** `appearances = G ?? GS` — if games played (`G`) is not available, games started (`GS`) is used as the appearance count.
- **ShO resolution chains CG estimation:** When resolving shutouts without an actual ShO value, if CG is also not available, CG is estimated first and then used as input for ShO estimation.
- **Voided parameters:** `params` and `filter` arguments are accepted in the function signatures but voided in the current implementation. This structure supports future refinement of the models without breaking the API.
- **Non-negative output:** All estimation functions clamp their result to `max(estimate, 0)` to avoid returning negative counts.
