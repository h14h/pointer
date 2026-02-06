# CSV Upload Workflow

## Source Files
- `src/components/CsvUpload.tsx`

## Dependencies
- [CSV Parsing](csv-parsing.md) — `parsePlayerCSV`, `mergePlayers`
- [Eligibility](eligibility.md) — eligibility computation functions
- [MLB Stats API](mlb-stats-api.md) — `fetchSeasonStatsForPlayers`
- [State](state.md) — `addProjectionGroup`, `applyEligibilityForGroup`
- [Types](types.md) — Player variants, `ProjectionGroup`, `IdSource`

## Three-Stage Flow

### Stage 1: File Upload
Drag-and-drop or browse for CSV/TSV files. Accepts multiple files but enforces at most one batter and one pitcher file. Player type can be forced or auto-detected.

### Stage 2: ID Selection (conditional)
Only shown when `needsIdSelection` is true — meaning the parser found no MLBAMID or PlayerId column. The user picks an ID source per file (generate automatically or use a specific column). Re-parses files with the chosen `IdConfig` on Continue.

### Stage 3: Preview & Import
Shows parsed player counts, up to 5 parse warnings, and a preview table of the first 5 players. The user names the group (auto-suggested from the first filename, fallback `"Methodology {N+1}"`) and optionally enables eligibility import.

## Eligibility Import

When enabled, the import runs after the projection group is added to the store:

1. Calls `fetchSeasonStatsForPlayers` with all player MLBAMID values
2. Iterates all players, computing eligibility per type:
   - Hitters → `computeHitterEligibility` from fielding data
   - Pitchers → `computePitcherEligibility` from pitching data
   - Two-way → compute both sides, then `mergeTwoWayEligibility`
   - Missing MLBAMID → warning + fallback to `eligibilityFromProfilePosition`
3. Calls `applyEligibilityForGroup` with the eligibility map
4. Uses `requestAnimationFrame` every 25 players to yield to the main thread (keeps the progress bar responsive)

**Important:** The projection group is added to the store *before* the eligibility import starts. If the import fails, the group exists with players but no eligibility data. The user can retry via a Retry Import button.

**Retry with backoff.** The `retryStatus` state shows attempt number, delay, and HTTP status during exponential backoff from the MLB Stats API integration.

## Key Edge Cases
- Multiple batter or pitcher files in one upload → error
- Empty group name on confirm → error
- Only one file type uploaded → amber warning about partial group
- Cancel/Back/Import buttons disabled during import; close button also disabled
- Import handles empty player lists (sets progress to 100% immediately)
