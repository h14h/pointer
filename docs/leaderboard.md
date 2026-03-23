# Leaderboard

## Source Files
- `src/components/Leaderboard.tsx`
- `src/lib/leaderboardDerived.ts`

## Dependencies
- [State](state.md) — all major state slices
- [Public Datasets](public-datasets.md) — built-in dataset bootstrap banner and protected baseline behavior
- [Scoring](scoring.md) — `calculatePlayerPoints`
- [Replacement Value (PAR)](paring-value.md) — `calculatePAR`
- [Eligibility](eligibility.md) — `POSITION_ORDER`
- [Utilities](utilities.md) — `isValidBaseballIp`
- TanStack React Table (external) — table engine

## Architecture

Split into two UI components plus a pure derivation helper:

**`Leaderboard` (parent)** — owns filter state (search, player view, draft filter), stat visibility selections, and deferred UI transitions for search / position / player-type changes. Projection-group switching now happens globally from the header instead of from a table-local control.

**`LeaderboardTable` (child, `React.memo`)** — owns sorting state, pagination state, and table rendering.

**`leaderboardDerived.ts`** — owns the expensive ranking pipeline plus lightweight filter/sort helpers so text search and position changes do not recompute PAR or view-specific points.

**`PublicDatasetBootstrap` (sibling on the page)** — waits for persisted store hydration, auto-loads the default public dataset when no protected baseline is present, and renders retryable loading/failure UI above the leaderboard when the built-in 2025 stats are unavailable.

## Ranking Pipeline

The child consumes a three-phase pipeline:
1. `buildBaseRankedPlayers` builds a stable full-player pool from the active projection group, computes `"all"`-view points once for PAR, recomputes display points for the active `playerView`, and annotates rows with draft / keeper state
2. `buildFilterMetadata` adds lowercase, accent-folded `searchText` and precomputed position tokens to each row
3. `filterRankedPlayers` applies position, draft, and text-search filters without touching scoring or PAR
4. `sortLeaderboardRows` sorts the filtered rows once before pagination
5. Search is applied after rank order is established, so the left gutter keeps the row's pre-search rank number

This keeps replacement levels stable when the user changes table-local filters, draft filters, or the visible player view.

**Minimum projection thresholds.** Before PAR and leaderboard rows are built, the pipeline drops fringe projections that are too small to be meaningful in draft prep. Hitters need at least `10 PA`, pitchers need at least `5 IP`, and two-way players stay in the `"all"` view if either side clears its threshold. In view-specific tabs, the threshold is applied only to that side of the player's projection.

**Two-way merging edge case:** When merging is off but the group only has `twoWayPlayers` (no separate batters/pitchers), two-way players are still shown. `canMergeTwoWay` requires `activeGroup` to be non-null and both batter and pitcher ID sources to be non-null and non-generated.

## PAR Column

PAR is displayed as a sortable column after the Points column. Format: whole numbers with a `+` prefix for positive values (for example `+15`, `-9`). Color coding: green (positive), red (negative), muted gray (zero).

## Rank Gutter

A narrow sticky `#` gutter on the left shows the player's table rank. The number reflects the current sorted leaderboard before text search is applied, so typing in the search box narrows the visible rows without renumbering them. This lets users search for a player while preserving their place in the broader ranking.

## Baseball IP Detection

`useBaseballIp` is a memo that checks whether *all* pitcher IP values in the active group pass `isValidBaseballIp`. This is an all-or-nothing flag — if any pitcher has IP like `5.3`, the entire group uses decimal IP math.

## Draft Interactions

In draft mode:
- **Left-click** an available row → draft the player for the derived current snake-draft team
- **Pick confirmation toast** appears immediately after a manual draft pick using the same plain Sonner style as the automatic draft toasts, with the player name, receiving team, and pick number
- **Undo confirmation toast** appears after undoing the most recent manual pick using the same plain Sonner style
- **Automatic keeper-skip toast** appears when the live cursor auto-advances or rewinds across keeper-reserved slots; single-slot auto-advances use the kept player's name as the toast title with the same red `K` badge used in the table, and include the team name plus pick number in the description
- **Undo Last Pick** lives in the draft context band above the filters and rewinds the most recent manual pick only

Keepers are no longer created from a row interaction. They are assigned in Settings, can reserve a specific draft round for their team's natural snake slot, and appear here as unavailable keeper-tagged rows.

Row styling reflects status: in normal leaderboard mode, drafted rows keep normal text treatment and show a compact neutral `D` badge, while keeper rows keep a distinct red-tinted highlight plus a minimal `K` badge. Both ownership badges expose the team name through the shared Pointer tooltip pattern on hover or keyboard focus. In live draft mode, drafted rows still use stronger unavailable styling.

## Draft Context Band

When draft mode is on, the leaderboard shows a compact current-pick band above the filters:

- current team on the clock
- overall pick
- round / pick-in-round
- drafted and keeper counts
- Undo Last Pick button

Reserved keeper slots are skipped automatically when deriving the current pick context, so the live draft band always points at the next manual pick.

## Stat Column Visibility

Users can toggle individual batting (16 options) and pitching (17 options) stat columns. Selections persist to `localStorage`. Defaults: R, HR, RBI, SB, AVG for batting; W, SV, K, ERA, WHIP for pitching. Invalid localStorage values are filtered to known stat IDs.

**Computed stats in display:**
- TB (total bases) = `1B + 2B×2 + 3B×3 + HR×4` — computed inline, not from CSV
- QS/CG/ShO — displayed exactly as imported (or import-estimated)
- AVG: `.toFixed(3)` with leading zero stripped (e.g., `.328` not `0.328`); ERA/WHIP: `.toFixed(2)`; null → dash

## Performance

- `useStore(..., shallow)` narrows the leaderboard subscription to only the slices this screen needs
- `useDeferredValue` smooths projection-group switching triggered from the header and live search updates; `startTransition` is used for player-type and position changes
- Expensive ranking/PAR derivation is isolated from lightweight search/position filtering in `leaderboardDerived.ts`
- A single explicit sort pass replaces the previous duplicate TanStack table instance used only for rank derivation
- Dev-only `performance` / `Profiler` logging can be used to confirm whether ranking, filtering, or rendering is the bottleneck during manual profiling
- All derived data (`rankedPlayers`, metadata rows, filtered rows, sorted rows, columns, stat sets`) is memoized
- Pagination resets to page 0 when filters change

## Global Filter

Searches both Name and Team fields, case-insensitive, using a pre-lowercased, accent-folded `searchText` field. Search input is normalized the same way, so ASCII queries like `jose berrios` still match names such as `José Berríos`. Search is applied after the main ranking is established, so filtered rows keep their original rank numbers in the left gutter.

## Built-In Baseline

The leaderboard treats the public 2025 baseline exactly like any other projection group once it is seeded into local state. The only special behavior is before data exists locally: the page shows a lightweight bootstrap banner while loading the public catalog and a retry action if the first fetch fails. After a successful seed, the leaderboard stays fully offline-capable because it reads from the persisted local projection group rather than refetching on every visit.

Projection switching is intentionally not duplicated in the filter row anymore. The board assumes the header communicates the active dataset globally, while the filter row remains dedicated to table-local concerns.
