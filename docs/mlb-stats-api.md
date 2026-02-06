# MLB Stats API

## Purpose

Fetches fielding and pitching stats from the MLB Stats API to compute position eligibility. Handles batching, retry logic with exponential backoff, and response parsing.

## Source Files

- `src/lib/mlbStatsApi.ts`

## Dependencies

- [Types](types.md) — `Position`
- [Eligibility](eligibility.md) — `emptyPositionGames`, `normalizePositionGames`, `POSITION_ORDER`

## Dependents

- [CSV Upload Workflow](csv-upload-workflow.md) — uses `fetchSeasonStatsForPlayers`

## Types

### `RetryOptions`

```typescript
{
  retries?: number;                                          // Default: 3
  baseDelayMs?: number;                                      // Default: 500
  onRetry?: (info: {attempt: number; delayMs: number; status?: number}) => void;
}
```

### `StatsApiResponse`

Shape of the MLB Stats API response from the `/stats` endpoint.

### `PeopleStatsResponse`

Shape of the MLB Stats API response from the `/people` endpoint.

## Constants

### `BASE_URL`

```typescript
"https://statsapi.mlb.com/api/v1"
```

## API Reference

### `fetchSeasonFieldingStats(season: number, retryOptions?: RetryOptions): Promise<Map<string, Record<Position, number>>>`

Fetches fielding stats for an entire season.

**Endpoint:** `{BASE_URL}/stats?stats=season&group=fielding&season={season}&sportId=1`

**Returns:** A `Map` keyed by player ID (string), with values being a record of games played at each position.

**Throws:** On non-ok HTTP response (after retries exhausted).

### `fetchSeasonPitchingStats(season: number, retryOptions?: RetryOptions): Promise<Map<string, {G: number; GS: number}>>`

Fetches pitching stats for an entire season.

**Endpoint:** `{BASE_URL}/stats?stats=season&group=pitching&season={season}&sportId=1`

**Returns:** A `Map` keyed by player ID (string), with values containing games (`G`) and games started (`GS`).

**Throws:** On non-ok HTTP response (after retries exhausted).

### `fetchSeasonStatsForPlayers(personIds: string[], season: number, retryOptions?: RetryOptions): Promise<{fieldingById, pitchingById, primaryPositionById}>`

Fetches fielding and pitching stats for a specific set of players, batched in groups of 50.

**Endpoint:** `{BASE_URL}/people?personIds={batch}&hydrate=stats(group=[fielding,pitching],type=[season],season={season})`

**Parameters:**
- `personIds` — Array of MLB player IDs. Deduplicated and filtered (empty strings removed) before batching.
- `season` — Season year.
- `retryOptions` — Optional retry configuration.

**Returns:**
- `fieldingById` — `Map<string, Record<Position, number>>` — Games at each position per player.
- `pitchingById` — `Map<string, {G: number; GS: number}>` — Pitching game counts per player.
- `primaryPositionById` — `Map<string, string>` — Primary position abbreviation per player.

**Returns empty maps if no valid IDs are provided** (after deduplication and filtering).

### `_internal`

Exported for testing purposes:

```typescript
{ parseFieldingStats, parsePitchingStats, parsePeopleStats, fetchWithRetry }
```

## Internal Functions

### `fetchWithRetry(url: string, options?: RequestInit, retryOptions?: RetryOptions): Promise<Response>`

Wraps `fetch` with automatic retry on transient failures.

**Retry conditions:** HTTP 429 (rate limited) and 5xx (server error) status codes.

**Backoff strategy:** Exponential with jitter.
```
delay = baseDelayMs * 2^attempt + random(0-250)ms
```

**Defaults:** 3 retries, 500ms base delay.

**Throws:** `"Network error fetching MLB Stats API"` after all retries are exhausted on network failure. Throws the response on non-retryable HTTP errors.

### `parseFieldingStats(data: StatsApiResponse): Map<string, Record<Position, number>>`

Extracts position games per player from the stats endpoint response. Accumulates games across multiple splits (e.g., a player traded mid-season). Normalizes all position records via `normalizePositionGames`.

### `parsePitchingStats(data: StatsApiResponse): Map<string, {G: number; GS: number}>`

Extracts games and games started from the stats endpoint response. Handles both `games` and `gamesPlayed` field names in the response (the API is inconsistent).

### `parsePeopleStats(data: PeopleStatsResponse): {fieldingById, pitchingById, primaryPositionById}`

Parses the people endpoint response, which can contain multiple stat groups per person.

**Pitching stats handling:** When a player has multiple pitching splits, keeps the split with the highest G/GS combination.

**Fielding stats handling:** Accumulates games across all fielding splits.

## Edge Cases

- **50-ID batch limit:** Player IDs are split into groups of 50 per request to avoid URL length constraints.
- **Deduplication:** Person IDs are deduplicated and empty strings are filtered out before batching.
- **Empty input:** Returns empty maps immediately if no valid IDs remain after filtering.
- **Exponential backoff with jitter:** Random 0-250ms added to each retry delay to prevent thundering herd when multiple requests fail simultaneously.
- **Inconsistent field names:** The API sometimes returns `games` and other times `gamesPlayed` for the same concept. Both are handled.
- **Multiple pitching splits:** For the people endpoint, when a player has multiple pitching stat splits (e.g., pre/post trade), the split with the highest G/GS combination is kept rather than summing.
- **Fielding stat accumulation:** Unlike pitching, fielding stats are accumulated across all splits (a player's position games from multiple teams are summed).
