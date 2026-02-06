# Eligibility

## Source Files
- `src/lib/eligibility.ts`

## Dependencies
- [Types](types.md) — `Eligibility`, `Position`

## Dependents
- [MLB Stats API](mlb-stats-api.md) — uses `emptyPositionGames`, `normalizePositionGames`
- [CSV Upload Workflow](csv-upload-workflow.md) — uses eligibility computation and merging functions
- [Leaderboard](leaderboard.md) — uses `POSITION_ORDER` for display ordering

## Eligibility Rules

These rules determine which positions a player can fill on a fantasy roster:

**Hitter position eligibility** — a player qualifies at a position if either:
- They played **≥ 20 games** at that position (absolute threshold), OR
- That position represents **≥ 25%** of their total games (relative threshold)

**SP eligibility** — a pitcher qualifies as a starting pitcher if either:
- GS ≥ 5, OR
- Start ratio (GS / G) ≥ 0.25

**RP eligibility** — a pitcher qualifies as a relief pitcher if either:
- Relief appearances ≥ 8, OR
- Relief ratio ≥ 0.25
- Relief apps = `max(G - GS, 0)` — never negative even if data has GS > G

**Division by zero guard.** Pitcher eligibility checks `G > 0` before computing ratios.

## Position Expansion

When only a general position string is available (from the MLB API profile position fallback), group positions expand:
- `"OF"` → LF, CF, RF (three separate positions)
- `"IF"` → 1B, 2B, 3B, SS
- `"P"` → both SP and RP eligible

Unknown position strings add a warning but do not throw.

## Two-Way Eligibility Merging

`mergeTwoWayEligibility` combines batting and pitching eligibility:
- Position games and eligible positions come from the batting (fielding) side
- SP/RP designations come from the pitching side
- Warnings from both sides are merged and deduplicated

## Constants

`POSITION_ORDER` defines the display order: C, 1B, 2B, 3B, SS, LF, CF, RF, DH. This is used by the leaderboard to format the Pos column.
