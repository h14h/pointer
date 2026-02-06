# Scoring

## Purpose

Calculates fantasy points for batters, pitchers, and two-way players using configurable scoring weights. Provides preset scoring configurations for popular fantasy baseball platforms.

## Source Files

- `src/lib/calculatePoints.ts`
- `src/lib/presets.ts`

## Dependencies

- [Types](types.md) — `Player`, `BatterPlayer`, `PitcherPlayer`, `TwoWayPlayer`, `BatterStats`, `PitcherStats`, `ScoringSettings`
- [Pitching Outcomes](pitching-outcomes.md) — `resolveQualityStarts`, `resolveCompleteGames`, `resolveShutouts`
- [Utilities](utilities.md) — `normalizeIp`

## Dependents

- [Leaderboard](leaderboard.md) — uses `calculatePlayerPoints` for ranking and display
- [State Management](state.md) — `defaultScoringSettings` derived from ESPN preset values
- [Scoring Form](scoring-form.md) — uses `scoringPresets` and `presetNames` for preset selection UI

## API Reference

### `calculateBatterPoints(player: BatterStats, settings: ScoringSettings["batting"]): number`

Calculates fantasy points for a batter by multiplying each counting stat by its configured weight.

**Parameters:**
- `player` — Batting stat line.
- `settings` — Batting scoring weights.

**Returns:** Total points, rounded to 1 decimal place.

**Stats used:** R, 1B, 2B, 3B, HR, RBI, SB, CS, BB, SO, HBP, SF, GDP. Conditionally includes H if `settings.H !== 0`.

**Null safety:** All stat values default to 0 via the `(player.X || 0)` pattern.

### `calculatePitcherPoints(player: PitcherStats, settings: ScoringSettings["pitching"], useBaseballIp = false): number`

Calculates fantasy points for a pitcher.

**Parameters:**
- `player` — Pitching stat line.
- `settings` — Pitching scoring weights.
- `useBaseballIp` — If true, normalizes IP via `normalizeIp()` before calculation.

**Returns:** Total points, rounded to 1 decimal place.

**Stats used:** IP, W, L, QS, CG, ShO, SV, BS, HLD, SO, H, ER, HR, BB, HBP. QS, CG, and ShO are resolved via `resolveQualityStarts`, `resolveCompleteGames`, and `resolveShutouts` respectively (uses actual stat if > 0, otherwise estimates).

### `calculatePlayerPoints(player: Player, settings: ScoringSettings, viewMode?: "all" | "batters" | "pitchers", useBaseballIp = false): number`

Top-level dispatch function that routes to the correct calculator based on player type.

**Parameters:**
- `player` — Any Player variant (batter, pitcher, or two-way).
- `settings` — Full scoring settings (batting + pitching).
- `viewMode` — Controls which stats contribute for two-way players.
- `useBaseballIp` — Passed through to pitcher calculation.

**Returns:** Total points, rounded to 1 decimal place.

**Two-way player behavior:**
- `"batters"` view mode — batting points only.
- `"pitchers"` view mode — pitching points only.
- `"all"` view mode (or omitted) — batting + pitching points combined.

## Internal Functions

### `calculateTwoWayBattingPoints(stats: TwoWayPlayer["_battingStats"], settings: ScoringSettings["batting"]): number`

Calculates batting points for the batting stats embedded in a two-way player. Does **not** round — rounding is deferred to the dispatch level in `calculatePlayerPoints`.

### `calculateTwoWayPitchingPoints(stats: TwoWayPlayer["_pitchingStats"], settings: ScoringSettings["pitching"], useBaseballIp: boolean): number`

Calculates pitching points for the pitching stats embedded in a two-way player. Does **not** round — rounding is deferred to the dispatch level.

## Constants

### `scoringPresets: Record<string, ScoringSettings>`

#### ESPN Standard

```
batting:  R=1, H=0, 1B=1, 2B=2, 3B=3, HR=4, RBI=1, SB=1, CS=-1, BB=1, SO=-1, HBP=1, SF=0, GDP=0
pitching: IP=3, W=5, L=-5, QS=0, CG=0, ShO=0, SV=5, BS=-3, HLD=0, SO=1, H=-1, ER=-2, HR=0, BB=-1, HBP=0
```

#### Yahoo Standard

```
batting:  R=1, H=0, 1B=1, 2B=2, 3B=3, HR=4, RBI=1, SB=2, CS=-1, BB=1, SO=-0.5, HBP=1, SF=0, GDP=0
pitching: IP=2.5, W=5, L=-3, QS=3, CG=0, ShO=0, SV=5, BS=-3, HLD=2, SO=1, H=-0.5, ER=-1, HR=-1, BB=-0.5, HBP=0
```

#### Fantrax Default

```
batting:  R=1, H=0, 1B=1, 2B=2, 3B=3, HR=4, RBI=1, SB=2, CS=-1, BB=1, SO=-1, HBP=1, SF=0, GDP=-0.5
pitching: IP=3, W=7, L=-5, QS=5, CG=0, ShO=0, SV=7, BS=-5, HLD=3, SO=2, H=-1, ER=-2, HR=-1, BB=-1, HBP=-1
```

#### Blank

All batting and pitching weights set to 0.

### `presetNames: string[]`

```typescript
["espn", "yahoo", "fantrax", "blank"]
```

## Edge Cases

- **H stat gating:** Hits (`H`) are only included in the batting calculation if `settings.H !== 0`. Most leagues score by hit type (1B, 2B, 3B, HR) instead of total hits.
- **IP normalization:** Only applied when `useBaseballIp = true`. Baseball IP uses `.1` and `.2` to represent 1/3 and 2/3 of an inning, which must be converted to decimal before multiplication.
- **Two-way rounding:** Internal two-way helpers (`calculateTwoWayBattingPoints`, `calculateTwoWayPitchingPoints`) do **not** round. Rounding to 1 decimal place happens once at the dispatch level in `calculatePlayerPoints`, avoiding double-rounding artifacts.
- **Null stat safety:** All stat values use the `(player.X || 0)` pattern, so undefined or null stats contribute 0 points rather than causing NaN.
