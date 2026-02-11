# Scoring

## Source Files
- `src/lib/calculatePoints.ts`
- `src/lib/presets.ts`

## Dependencies
- [Types](types.md) — Player variants, `ScoringSettings`
- [Utilities](utilities.md) — `normalizeIp`

## Dependents
- [Leaderboard](leaderboard.md) — uses `calculatePlayerPoints` for ranking
- [State](state.md) — default scoring settings use ESPN preset values
- [Settings Page](settings-page.md) — scoring section uses `scoringPresets` and `presetNames` for preset application

## How Scoring Works

Each counting stat is multiplied by its configured weight and the results are summed. Rate stats (AVG, ERA, WHIP, etc.) are never used in point calculations — they exist only for leaderboard display.

**H stat gating.** Hits (`H`) are only included if `settings.H !== 0`. Most leagues score by hit type (1B, 2B, 3B, HR) rather than total hits, so H defaults to 0 in all presets. Including both H and hit-type weights would double-count.

**QS/CG/ShO are treated as literal imported values.** Scoring does not run runtime estimation. Missing outcomes remain 0 unless they were estimated earlier during CSV import.

**IP normalization.** When `useBaseballIp` is true, IP is converted from baseball notation (5.1 = 5⅓) to decimal before multiplying by the IP weight. See [Utilities](utilities.md).

**Two-way player dispatch.** `calculatePlayerPoints` routes based on `_type`:
- Batters → batting calculation only
- Pitchers → pitching calculation only
- Two-way → depends on `viewMode`: `"batters"` = batting only, `"pitchers"` = pitching only, `"all"` (default) = batting + pitching combined

**Rounding strategy.** The internal two-way helpers do *not* round. Rounding to 1 decimal place happens once at the dispatch level to avoid double-rounding artifacts.

**Null safety.** All stat values use `(player.X || 0)`, so missing stats contribute 0 points.

## Presets

Four presets are available: `espn`, `yahoo`, `fantrax`, `blank`. The preset values are in `src/lib/presets.ts`. The store's default scoring settings match ESPN.
