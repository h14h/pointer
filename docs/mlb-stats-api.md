# MLB Stats API

## Source Files
- `src/lib/mlbStatsApi.ts`

## Dependencies
- [Types](types.md) — `Position`
- [Eligibility](eligibility.md) — `emptyPositionGames`, `normalizePositionGames`

## Dependents
- [CSV Upload Workflow](csv-upload-workflow.md) — uses `fetchSeasonStatsForPlayers`

## What This Does

Fetches real fielding and pitching game data from MLB's public Stats API to compute position eligibility. The API is free, unauthenticated, and rate-limited.

**Base URL:** `https://statsapi.mlb.com/api/v1`

## Key Behaviors

**50-ID batch limit.** Player IDs are split into groups of 50 per request to avoid URL length constraints. IDs are deduplicated and empty strings are filtered before batching.

**Retry with exponential backoff.** Transient failures (HTTP 429 and 5xx) are retried up to 3 times with `baseDelayMs * 2^attempt + random(0-250ms)` jitter. The jitter prevents thundering herd when multiple batches fail simultaneously. The `onRetry` callback allows the UI to display retry status.

**Inconsistent API field names.** The MLB API sometimes returns `games` and other times `gamesPlayed` for the same concept. Both are handled in the parser.

**Fielding stats are accumulated** across splits — a player traded mid-season has their games at each position summed across all teams.

**Pitching stats use highest-combo** — when a player has multiple pitching splits, the split with the highest G/GS combination is kept rather than summing. This avoids double-counting games for pitchers who change teams.

**Empty input short-circuit.** If no valid IDs remain after deduplication and filtering, empty maps are returned immediately without making any requests.

## Testing

Internal parse functions are exported via `_internal` for unit testing: `parseFieldingStats`, `parsePitchingStats`, `parsePeopleStats`, `fetchWithRetry`.
