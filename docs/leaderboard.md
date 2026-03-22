# Leaderboard

## Source Files
- `src/components/Leaderboard.tsx`
- `src/lib/leaderboardDerived.ts`

## Dependencies
- [State](state.md) — all major state slices
- [Scoring](scoring.md) — `calculatePlayerPoints`
- [Replacement Value (PAR)](paring-value.md) — `calculatePAR`
- [Eligibility](eligibility.md) — `POSITION_ORDER`
- [Utilities](utilities.md) — `isValidBaseballIp`
- TanStack React Table (external) — table engine

## Architecture

Split into two UI components plus a pure derivation helper:

**`Leaderboard` (parent)** — owns filter state (search, player view, draft filter), stat visibility selections, projection group selection, and deferred UI transitions for search / position / player-type changes.

**`LeaderboardTable` (child, `React.memo`)** — owns sorting state, pagination state, and table rendering.

**`leaderboardDerived.ts`** — owns the expensive ranking pipeline plus lightweight filter/sort helpers so text search and position changes do not recompute PAR or view-specific points.

## Ranking Pipeline

The child consumes a three-phase pipeline:
1. `buildBaseRankedPlayers` builds a stable full-player pool from the active projection group, computes `"all"`-view points once for PAR, recomputes display points for the active `playerView`, and annotates rows with draft / keeper state
2. `buildFilterMetadata` adds lowercase `searchText` and precomputed position tokens to each row
3. `filterRankedPlayers` applies position, draft, and text-search filters without touching scoring or PAR
4. `sortLeaderboardRows` sorts the filtered rows once before pagination
5. Search is applied after rank order is established, so the left gutter keeps the row's pre-search rank number

This keeps replacement levels stable when the user changes table-local filters, draft filters, or the visible player view.

**Two-way merging edge case:** When merging is off but the group only has `twoWayPlayers` (no separate batters/pitchers), two-way players are still shown. `canMergeTwoWay` requires `activeGroup` to be non-null and both batter and pitcher ID sources to be non-null and non-generated.

## PAR Column

PAR is displayed as a sortable column after the Points column. Format: whole numbers with a `+` prefix for positive values (for example `+15`, `-9`). Color coding: green (positive), red (negative), muted gray (zero).

## Rank Gutter

A narrow sticky `#` gutter on the left shows the player's table rank. The number reflects the current sorted leaderboard before text search is applied, so typing in the search box narrows the visible rows without renumbering them. This lets users search for a player while preserving their place in the broader ranking.

## Baseball IP Detection

`useBaseballIp` is a memo that checks whether *all* pitcher IP values in the active group pass `isValidBaseballIp`. This is an all-or-nothing flag — if any pitcher has IP like `5.3`, the entire group uses decimal IP math.

## Draft Interactions

In draft mode:
- **Left-click** a row → toggle drafted for the active team
- **Right-click** a row → toggle keeper for the active team
- **Checkbox** in the Name column → same as left-click (with `stopPropagation` to prevent row handler)

Row styling reflects status: drafted rows get strikethrough name with slate background; keeper rows get bold amber name with amber background and team badge.

## Stat Column Visibility

Users can toggle individual batting (16 options) and pitching (17 options) stat columns. Selections persist to `localStorage`. Defaults: R, HR, RBI, SB, AVG for batting; W, SV, K, ERA, WHIP for pitching. Invalid localStorage values are filtered to known stat IDs.

**Computed stats in display:**
- TB (total bases) = `1B + 2B×2 + 3B×3 + HR×4` — computed inline, not from CSV
- QS/CG/ShO — displayed exactly as imported (or import-estimated)
- AVG: `.toFixed(3)` with leading zero stripped (e.g., `.328` not `0.328`); ERA/WHIP: `.toFixed(2)`; null → dash

## Performance

- `useStore(..., shallow)` narrows the leaderboard subscription to only the slices this screen needs
- `useDeferredValue` smooths projection-group switching and live search updates; `startTransition` is used for player-type and position changes
- Expensive ranking/PAR derivation is isolated from lightweight search/position filtering in `leaderboardDerived.ts`
- A single explicit sort pass replaces the previous duplicate TanStack table instance used only for rank derivation
- Dev-only `performance` / `Profiler` logging can be used to confirm whether ranking, filtering, or rendering is the bottleneck during manual profiling
- All derived data (`rankedPlayers`, metadata rows, filtered rows, sorted rows, columns, stat sets`) is memoized
- Pagination resets to page 0 when filters change

## Global Filter

Searches both Name and Team fields, case-insensitive, using a pre-lowercased `searchText` field. Search is applied after the main ranking is established, so filtered rows keep their original rank numbers in the left gutter.
