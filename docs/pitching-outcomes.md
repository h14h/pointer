# Pitching Outcomes

## Source Files
- `src/lib/pitchingOutcomes.ts`

## Dependencies
- [Types](types.md) — `PitcherStats`
- [Utilities](utilities.md) — `normalizeIp`

## Dependents
- [Scoring](scoring.md) — uses resolve functions in point calculation
- [Leaderboard](leaderboard.md) — uses resolve functions for display columns

## Why This Exists

Many projection systems (FanGraphs Steamer, ZiPS, etc.) do not project quality starts, complete games, or shutouts. Without this module, pitchers would score 0 for those categories even when they clearly should earn points. The estimation models fill these gaps using stats that projections do provide (GS, IP, ERA).

## Resolve vs Estimate Pattern

Each outcome has two layers:

1. **Resolve functions** (`resolveQualityStarts`, `resolveCompleteGames`, `resolveShutouts`) — the public API. These return the actual stat value if it exists (> 0). If the stat is missing or zero, they validate inputs and delegate to the corresponding estimate function.

2. **Estimate functions** (`estimateQualityStarts`, `estimateCompleteGames`, `estimateShutouts`) — linear regression models that predict the outcome from GS, adjusted IP, and ERA.

This two-layer design means projections that *do* include QS/CG/ShO will use those values directly. Estimation is only a fallback.

## How Estimation Works

All three models share the same structure:
1. Guard: return 0 if GS ≤ 0, IP ≤ 0, ERA ≤ 0, or GS < 6
2. Compute relief apps: `max((G ?? GS) - GS, 0)`
3. Subtract estimated relief innings from total IP (relief IP factor differs per model)
4. Apply linear regression: `intercept + β₁·GS + β₂·adjIP + β₃·ERA`
5. Clamp result to `max(estimate, 0)`

**Relief IP adjustment factors** differ because the models were fit independently:
- QS: 1.81 IP per relief appearance
- CG: 1.59 IP per relief appearance
- ShO: 1.62 IP per relief appearance

**ShO chains CG estimation.** When resolving shutouts and CG is also missing, CG is estimated first and passed as input to the ShO estimator. (Though note: the current ShO regression model voids the CG input — the chaining exists for API compatibility and future model revisions.)

## GS < 6 Guard

All estimation functions return 0 for pitchers with fewer than 6 games started. This is both a quality threshold (too few starts to estimate meaningfully) and the threshold used by `predictHasQualityStarts`.

## Voided Parameters

The `params` and `filter` arguments are accepted in function signatures but voided in the current implementation (`void params`). This preserves the API surface for future model refinements without breaking callers.

## Unused Infrastructure

The file contains substantial infrastructure (Poisson CDF, piecewise IP ramps, effective ERA blending, per-start QS probability) that the current linear regression models do not use. This was part of an earlier parametric model and remains for potential future use. The `DEFAULT_PITCHING_OUTCOME_PARAMS` constant (40+ parameters) configures this infrastructure.
