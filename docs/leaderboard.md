# Leaderboard

## Source Files
- `src/components/Leaderboard.tsx`

## Dependencies
- [State](state.md) — all major state slices
- [Scoring](scoring.md) — `calculatePlayerPoints`
- [Eligibility](eligibility.md) — `POSITION_ORDER`
- [Utilities](utilities.md) — `isValidBaseballIp`
- TanStack React Table (external) — table engine

## Architecture

Split into two components:

**`Leaderboard` (parent)** — owns filter state (search, player view, draft filter), stat visibility selections, and projection group selection. No table logic.

**`LeaderboardTable` (child, `React.memo`)** — owns the TanStack table instance, sorting, pagination, and row rendering. Receives all data as props. Memoized to skip re-renders when only parent-level state changes (like the stat visibility panel toggling).

## Ranking Pipeline

The `rankedPlayers` memo in the child is the core computation:
1. Select players from the active projection group based on `playerView` (all/batters/pitchers)
2. Optionally merge two-way players (when `canMergeTwoWay && mergeTwoWayRankings`) — deduplicates via a `twoWayIds` Set so two-way players replace their separate batter/pitcher entries
3. Calculate `projectedPoints` for each player via `calculatePlayerPoints`
4. Annotate each player with draft/keeper status and team index from `draftState`

**Two-way merging edge case:** When merging is off but the group only has `twoWayPlayers` (no separate batters/pitchers), two-way players are still shown. `canMergeTwoWay` requires both batter and pitcher ID sources to be non-null and non-generated.

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
- AVG: `.toFixed(3)` with leading zero stripped; ERA/WHIP: `.toFixed(2)`; null → dash

## Performance

- `useDeferredValue` on the active group ID smooths projection group switching (table dims with overlay during transition)
- `React.memo` on `LeaderboardTable` prevents re-renders from parent state changes
- All derived data (`rankedPlayers`, `filteredPlayers`, `columns`, stat Sets) is memoized
- Pagination resets to page 0 when filters change

## Global Filter

Searches both Name and Team fields, case-insensitive.
