# Leaderboard

## Source Files
- `src/components/Leaderboard.tsx`

## Dependencies
- [State](state.md) — all major state slices
- [Scoring](scoring.md) — `calculatePlayerPoints`
- [Replacement Value (PAR)](paring-value.md) — `calculatePAR`
- [Eligibility](eligibility.md) — `POSITION_ORDER`
- [Utilities](utilities.md) — `isValidBaseballIp`
- TanStack React Table (external) — table engine

## Architecture

Split into two components:

**`Leaderboard` (parent)** — owns filter state (search, player view, draft filter), stat visibility selections, and projection group selection. No table logic.

**`LeaderboardTable` (child, `React.memo`)** — owns the TanStack table instance, sorting, pagination, and row rendering. Receives all data as props. Memoized to skip re-renders when only parent-level state changes (like the stat visibility panel toggling).

## Ranking Pipeline

The child computes rankings in two stages:
1. Build a stable full-player pool from the active projection group, with optional two-way merging
2. Calculate `projectedPoints` for that full pool in `"all"` mode and run `calculatePAR` once to establish replacement values from the complete roster universe
3. Build the current `playerView` subset (all/batters/pitchers)
4. Recalculate `projectedPoints` for display in the current view and attach the already-computed PAR by player ID
5. Annotate each player with draft/keeper status and team index from `draftState`

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

- `useDeferredValue` on the active group ID smooths projection group switching (table dims with overlay during transition)
- `React.memo` on `LeaderboardTable` prevents re-renders from parent state changes
- All derived data (`rankedPlayers`, `filteredPlayers`, `columns`, stat Sets) is memoized
- Pagination resets to page 0 when filters change

## Global Filter

Searches both Name and Team fields, case-insensitive. Search is applied after the main ranking is established, so filtered rows keep their original rank numbers in the left gutter.
