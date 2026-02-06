# Leaderboard

## Purpose
Main player ranking table with sorting, filtering, draft interactions, and stat column customization. Split into a parent `Leaderboard` component that owns filter state, stat visibility, and group selection, and a memoized `LeaderboardTable` child that owns the TanStack table instance, sorting, pagination, and row rendering.

## Source Files
- `src/components/Leaderboard.tsx`

## Dependencies
- `react` -- `useMemo`, `useState`, `useCallback`, `useDeferredValue`, `useEffect`, `memo`, `Dispatch`, `SetStateAction`
- `@tanstack/react-table` -- `useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPaginationRowModel`, `flexRender`, `SortingState`, `ColumnDef`
- `@/store` -- `useStore` ([state spec](./state.md))
- `@/lib/calculatePoints` -- `calculatePlayerPoints` ([scoring spec](./scoring.md))
- `@/lib/eligibility` -- `POSITION_ORDER` ([eligibility spec](./eligibility.md))
- `@/lib/pitchingOutcomes` -- `resolveQualityStarts`, `resolveCompleteGames`, `resolveShutouts` ([pitching outcomes spec](./pitching-outcomes.md))
- `@/lib/ipMath` -- `isValidBaseballIp` ([utilities spec](./utilities.md))
- `@/types` -- `Player`, `RankedPlayer`, `DraftState`, `ScoringSettings`, `ProjectionGroup`, `LeagueSettings` ([types spec](./types.md))

## Props

### Leaderboard (parent)
None. All data comes from the Zustand store.

### LeaderboardTable (child)
```ts
type LeaderboardTableProps = {
  projectionGroups: ProjectionGroup[];
  activeGroupId: string | null;
  scoringSettings: ScoringSettings;
  leagueSettings: LeagueSettings;
  draftState: DraftState;
  isDraftMode: boolean;
  mergeTwoWayRankings: boolean;
  toggleDraftedForTeam: (playerId: string, teamIndex: number) => void;
  toggleKeeperForTeam: (playerId: string, teamIndex: number) => void;
  activeTeamIndex: number;
  playerView: PlayerView;
  globalFilter: string;
  setGlobalFilter: Dispatch<SetStateAction<string>>;
  draftFilter: DraftFilter;
  battingStatIds: string[];
  pitchingStatIds: string[];
};
```

## State

### Parent (Leaderboard)
| Variable | Type | Purpose |
|---|---|---|
| `globalFilter` | `string` | Search input value, passed down to table's global filter |
| `playerView` | `"all" \| "batters" \| "pitchers"` | Player type filter |
| `draftFilter` | `"all" \| "available" \| "drafted" \| "keepers"` | Draft status filter (only effective in draft mode) |
| `isStatsOpen` | `boolean` | Toggle for stat visibility panel |
| `selectedBattingStats` | `string[]` | Which batting stat columns are visible; persisted to `localStorage` |
| `selectedPitchingStats` | `string[]` | Which pitching stat columns are visible; persisted to `localStorage` |

Derived in parent (not state, but computed inline):
| Variable | Type | Purpose |
|---|---|---|
| `currentGroupId` | `string \| null` | `activeProjectionGroupId ?? projectionGroups[0]?.id ?? null` |
| `deferredGroupId` | `string \| null` | `useDeferredValue(currentGroupId)` -- smooths group transitions |
| `isSwitchingGroups` | `boolean` | `deferredGroupId !== currentGroupId` |

### Child (LeaderboardTable)
| Variable | Type | Purpose |
|---|---|---|
| `sorting` | `SortingState` | TanStack table sorting state; defaults to `[{ id: "projectedPoints", desc: true }]` |
| `pagination` | `{ pageIndex: number; pageSize: number }` | Pagination state; default `pageSize` is 50 |

## Store Bindings
**Read:** `projectionGroups`, `activeProjectionGroupId`, `scoringSettings`, `leagueSettings`, `draftState`, `isDraftMode`, `mergeTwoWayRankings`

**Write:** `setActiveProjectionGroup`, `toggleDraftedForTeam`, `toggleKeeperForTeam`

## Key Computations

| Name | Location | Description |
|---|---|---|
| `battingStatSet` | Parent | `useMemo` -- `Set<string>` for O(1) column visibility lookup on batting stats |
| `pitchingStatSet` | Parent | `useMemo` -- `Set<string>` for O(1) column visibility lookup on pitching stats |
| `twoWayIds` | Child | `useMemo` -- `Set<string>` of two-way player `_id` values for deduplication when merging |
| `useBaseballIp` | Child | `useMemo` -- boolean, checks if all pitcher IP values pass `isValidBaseballIp`; determines whether baseball IP math (e.g., 6.1 = 6 1/3 innings) is used |
| `canMergeTwoWay` | Child | Derived boolean -- true when both batter and pitcher ID sources are non-null and non-generated |
| `rankedPlayers` | Child | `useMemo` -- core pipeline: selects players from active group by `playerView`, optionally merges two-way players, calculates `projectedPoints` via `calculatePlayerPoints`, builds `RankedPlayer[]` with `isDrafted`/`isKeeper`/`draftedTeamIndex`/`keeperTeamIndex` |
| `filteredPlayers` | Child | `useMemo` -- applies `draftFilter` to `rankedPlayers` (available/drafted/keepers/all) |
| `columns` | Child | `useMemo` -- builds TanStack `ColumnDef<RankedPlayer>[]`: base columns (ADP, Name, Team, Type, Pos, Points), then conditionally visible batting stat columns (16 possible: H, 1B, 2B, 3B, TB, HR, R, RBI, BB, HBP, SO, SB, CS, SF, GDP, AVG) and pitching stat columns (17 possible: IP, K, H, ER, HR, BB, HBP, W, L, QS, SV, HLD, BS, CG, ShO, ERA, WHIP) filtered by `battingStatIds`/`pitchingStatIds`. Leading separator border added between stat groups. |
| `handleToggleDrafted` | Child | `useCallback` -- wraps `toggleDraftedForTeam(playerId, activeTeamIndex)` |

## Event Handlers

| Interaction | Handler | Behavior |
|---|---|---|
| Search input | `onChange` on text input | Sets `globalFilter` |
| Player view select | `onChange` on select | Sets `playerView` to `"all"`, `"batters"`, or `"pitchers"` |
| Draft filter select | `onChange` on select | Sets `draftFilter`; only rendered in draft mode |
| Projection group select | `onChange` on select | Calls `setActiveProjectionGroup(nextId)`; only rendered when `projectionGroups.length > 1` |
| Stat visibility checkbox | `onChange` on checkbox | Calls `toggleStat(group, statId, checked)` |
| All/None buttons | `onClick` | Calls `applyAllStats(group)` or `clearAllStats(group)` |
| Customize Stats button | `onClick` | Toggles `isStatsOpen` |
| Column header click | `onClick` via `getToggleSortingHandler()` | Cycles sort direction on that column |
| Table row left-click | `onClick` on `<tr>` | In draft mode: calls `handleToggleDrafted(player._id)` |
| Table row right-click | `onContextMenu` on `<tr>` | In draft mode: `preventDefault`, calls `toggleKeeperForTeam(player._id, activeTeamIndex)` |
| Name column checkbox | `onChange` on checkbox | Calls `handleToggleDrafted(player._id)`; `stopPropagation` prevents row click |
| Pagination prev/next | `onClick` on buttons | `table.previousPage()` / `table.nextPage()` |
| Rows per page select | `onChange` on select | Resets `pagination` to `{ pageIndex: 0, pageSize: nextSize }` |

## Layout

1. **Filters panel** -- search text input, player view `<select>` (All/Batters/Pitchers), projection group `<select>` (conditional, if multiple groups exist, with spinner during group switch), draft filter `<select>` (conditional, draft mode only), draft hint text (draft mode only), "Customize Stats" toggle button
2. **Stat visibility panel** (conditional, when `isStatsOpen`) -- header with description and Close button, two-column grid:
   - Batting section: 16 checkboxes (H, 1B, 2B, 3B, HR, TB, R, RBI, BB, HBP, SO, SB, CS, SF, GIDP, AVG), All/None buttons
   - Pitching section: 17 checkboxes (IP, K, H, ER, HR, BB, HBP, W, L, QS, SV, HLD, BS, CG, ShO, ERA, WHIP), All/None buttons
3. **Table** -- horizontal scroll container with overlay dimming during group switch:
   - `<thead>`: sortable column headers with sort direction indicators (ascending arrow / descending arrow)
   - `<tbody>`: rows with:
     - **ADP cell**: rounded integer or dash
     - **Name cell**: optional draft checkbox (draft mode), player name (strikethrough if drafted, bold amber if keeper), team badge showing team label for drafted/keeper status
     - **Team cell**: team abbreviation
     - **Type cell**: colored badge (BAT sky, PIT indigo, 2W amber)
     - **Pos cell**: formatted eligible positions from `POSITION_ORDER`, SP/RP suffixes
     - **Points cell**: `projectedPoints.toFixed(1)` in emerald
     - **Stat cells**: conditionally visible batting and pitching columns
4. **Pagination bar** -- Prev/Next buttons (disabled at bounds), page X of Y display, total row count, rows per page select (25/50/100)

## Performance

| Technique | Where | Purpose |
|---|---|---|
| `useDeferredValue` | `deferredGroupId` in parent | Prevents blocking UI during projection group switching |
| `React.memo` | `LeaderboardTable` | Skips re-render when props are shallowly equal |
| `useMemo` | All derived data (stat Sets, `twoWayIds`, `useBaseballIp`, `rankedPlayers`, `filteredPlayers`, `columns`) | Avoids recomputation on unrelated re-renders |
| `useCallback` | `toggleStat`, `applyAllStats`, `clearAllStats`, `handleToggleDrafted`, `handleRowClick` | Stable function references to prevent child re-renders |
| localStorage persistence | `selectedBattingStats`, `selectedPitchingStats` | Stat column selections survive page refreshes |
| Pagination reset effect | `useEffect` on `globalFilter`, `draftFilter`, `playerView`, `activeGroupId` | Resets `pageIndex` to 0 when filters change |

## Edge Cases

| Condition | Behavior |
|---|---|
| No active group or all player arrays empty | Centered empty state: "No players loaded" / "Upload a CSV file to get started" |
| Group switching in progress (`isSwitchingGroups`) | Semi-transparent overlay on table; spinner next to group select |
| Drafted row | Background `bg-slate-100`, name text with `line-through`, emerald team label badge |
| Keeper row | Background `bg-amber-100/60`, name text bold amber, amber team label badge |
| Non-drafted/keeper rows | Alternating `bg-white` / `bg-slate-50` with hover highlights |
| Draft mode off | Draft filter select hidden, row click/right-click are no-ops, checkboxes hidden in Name column |
| Stat visibility defaults | If localStorage is empty or invalid, falls back to `DEFAULT_BATTING_STATS` (R, HR, RBI, SB, AVG) and `DEFAULT_PITCHING_STATS` (W, SV, K, ERA, WHIP) |
| Invalid localStorage values | Filtered to only include known stat option IDs |
| AVG/ERA/WHIP formatting | AVG: `.toFixed(3)` with leading zero stripped; ERA/WHIP: `.toFixed(2)`; null values show dash |
| TB (total bases) | Computed inline: `1B + 2B*2 + 3B*3 + HR*4` |
| QS/CG/ShO | Resolved via `resolveQualityStarts`/`resolveCompleteGames`/`resolveShutouts` using `useBaseballIp` flag |
| Global filter | Searches both `Name` and `Team` (case-insensitive) |
| Two-way player merging | When `canMergeTwoWay && mergeTwoWayRankings`: two-way players replace their separate batter/pitcher entries (deduped via `twoWayIds`). When merging is off but only `twoWayPlayers` exist (no separate batters/pitchers), two-way players are still shown. |
