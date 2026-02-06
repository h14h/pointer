# Eligibility

## Purpose

Computes position eligibility for batters and pitchers based on games played at each position. Provides helpers for normalizing position data, parsing profile position strings, and merging two-way eligibility.

## Source Files

- `src/lib/eligibility.ts`

## Dependencies

- [Types](types.md) — `Eligibility`, `Position`

## Dependents

- [MLB Stats API](mlb-stats-api.md) — uses `emptyPositionGames`, `normalizePositionGames`, `POSITION_ORDER`
- [CSV Upload Workflow](csv-upload-workflow.md) — uses `computeHitterEligibility`, `computePitcherEligibility`, `eligibilityFromProfilePosition`, `mergeTwoWayEligibility`, `emptyPositionGames`, `mergeWarnings`
- [Leaderboard](leaderboard.md) — uses `POSITION_ORDER`

## API Reference

### `emptyPositionGames(): Record<Position, number>`

Returns a record with all 9 positions set to 0.

### `normalizePositionGames(raw: Partial<Record<Position, number>>): Record<Position, number>`

Fills missing positions with 0 and validates that all values are finite numbers. Non-finite values are replaced with 0.

**Parameters:**
- `raw` — Partial position-to-games mapping (may have missing keys or invalid values).

**Returns:** Complete record with all 9 positions guaranteed to have valid numeric values.

### `computeHitterEligibility(positionGames: Record<Position, number>, season: number, warnings?: string[]): Eligibility`

Computes position eligibility for a hitter based on games played at each position.

**Parameters:**
- `positionGames` — Games played at each position.
- `season` — Season year (stored on the result for reference).
- `warnings` — Optional array to pass through to the result.

**Returns:** An `Eligibility` object with `isSP: false` and `isRP: false`.

**Eligibility rule:** A player is eligible at a position if they played >= 20 games there OR >= 25% of their total games at that position.

### `computePitcherEligibility(pitching: {G: number; GS: number}, season: number, warnings?: string[]): Eligibility`

Computes SP/RP eligibility for a pitcher based on games and games started.

**Parameters:**
- `pitching` — Object with `G` (total games) and `GS` (games started).
- `season` — Season year.
- `warnings` — Optional warnings array.

**Returns:** An `Eligibility` object with empty `positionGames` and `eligiblePositions`.

**Eligibility rules:**
- **SP eligible:** GS >= 5 OR start ratio (GS / G) >= 0.25.
- **RP eligible:** Relief apps >= 8 OR relief ratio >= 0.25.
- Relief apps = `max(G - GS, 0)`.

### `mergeTwoWayEligibility(batting: Eligibility, pitching: Eligibility): Eligibility`

Combines batting position eligibility with pitching designations for a two-way player.

**Parameters:**
- `batting` — Eligibility computed from fielding stats.
- `pitching` — Eligibility computed from pitching stats.

**Returns:** Merged `Eligibility` with:
- `positionGames` and `eligiblePositions` from `batting`.
- `isSP` and `isRP` from `pitching`.
- `sourceSeason` from `batting`.
- Merged and deduplicated `warnings` from both inputs.

### `eligibilityFromProfilePosition(position: string, season: number, warnings?: string[]): Eligibility`

Fallback parser for profile position strings when detailed game-by-game data is not available.

**Parameters:**
- `position` — Position string (e.g., `"SS"`, `"OF"`, `"SP"`, `"P"`).
- `season` — Season year.
- `warnings` — Optional warnings array.

**Returns:** An `Eligibility` object based on string parsing.

**Mapping rules (case-insensitive):**
- `"P"` — Sets both `isSP: true` and `isRP: true`.
- `"SP"` — Sets `isSP: true`.
- `"RP"` — Sets `isRP: true`.
- `"OF"` — Expands to `[LF, CF, RF]`.
- `"IF"` — Expands to `[1B, 2B, 3B, SS]`.
- Exact position match (e.g., `"C"`, `"1B"`) — Single position eligibility.
- Unknown position — Adds a warning to the warnings array but does not throw.

### `mergeWarnings(a?: string[], b?: string[]): string[] | undefined`

Merges two warning arrays, deduplicating entries via `Set`. Returns `undefined` if both inputs are undefined.

## Constants

### `POSITIONS: Position[]`

```typescript
["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"]
```

### `POSITION_ORDER: Position[]`

Same as `POSITIONS`. Exported as a separate alias for semantic clarity in display/ordering contexts.

## Edge Cases

- **20-game absolute threshold:** A player with exactly 20 games at a position qualifies regardless of their total games played.
- **25% relative threshold:** For players with fewer than 20 games at a position, they qualify if that position represents >= 25% of their total games.
- **"OF" expansion:** Expands to LF, CF, RF (three separate positions), not a single "OF" slot.
- **"IF" expansion:** Expands to 1B, 2B, 3B, SS.
- **Unknown positions:** Do not throw an error. A warning is appended to the warnings array, and the position is silently skipped.
- **Division by zero guard:** `computePitcherEligibility` checks `hasGames` (G > 0) before computing start/relief ratios to avoid division by zero.
- **Relief app calculation:** `reliefApps = max(G - GS, 0)` — never negative even if data has GS > G.
