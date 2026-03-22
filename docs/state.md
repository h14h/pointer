# State Management

## Source Files
- `src/store/index.ts`

## Dependencies
- [Types](types.md) — all major types
- Zustand (external) — state management with `persist` middleware

## Dependents
All UI components: [Leaderboard](leaderboard.md), [CSV Upload Workflow](csv-upload-workflow.md), [Settings Page](settings-page.md), [Header](header.md)

## Persistence

- **Storage key:** `"pointer-storage"`
- **Version:** 6
- **Middleware:** Zustand `persist` to `localStorage`
- **Hydration strategy:** `skipHydration: true` with a client-only `StoreHydrator` mounted from the root layout. The store uses deterministic SSR defaults so server HTML matches the client's pre-rehydration render before persisted league state is applied.

Migrations handle upgrades from earlier versions: adding CG/ShO scoring fields (v3), migrating flat player arrays into projection groups, converting legacy `draftedIds`/`keeperIds` string arrays into the team-based record structure, wrapping single-league data in a `League` object (v4→v5), and converting the old `activeTeamIndex` draft cursor into the snake-draft session shape (v5→v6). Legacy drafted and keeper ownership is preserved; `history` starts empty because prior pick chronology is unknowable.

## Key Invariants

**Drafted/keeper mutual exclusivity.** `draftPlayer` refuses keepers, and `setKeeperForTeam` removes any drafted assignment for the same player. A player cannot be both.

**Snake draft as source of truth.** Current team, overall pick, and round context are derived from `pickIndex`, league size, and `format: "snake"`. No component owns its own draft-order math.

**Keeper reservations consume draft slots.** `keeperSlotByPlayer` can reserve specific snake-draft slots for keepers. The live draft cursor skips reserved keeper slots automatically, so the board always points at the next open manual pick.

**Keeper edits can rewind a pre-draft cursor.** When keeper reservations change before any manual picks have been made, the live cursor is recomputed from slot 1 rather than treated as monotonic. This prevents stale early-slot reservations from leaving the draft "on the clock" at the wrong overall pick after a keeper is moved to a later round.

**Manual picks only in history.** `history` contains only manual picks. `pickIndex` is now the next draft slot cursor rather than a simple manual-pick count, because keeper reservations may consume slots without creating history entries. Undo removes only the latest manual draft pick and restores its original slot index.

**Reset preserves keeper setup.** `resetDraft` operates on the active league only and clears only manual draft progress: `draftedByTeam`, `history`, and the live pick cursor. Keeper ownership and reserved keeper slots remain intact, and the cursor rewinds to the first open non-keeper slot.

**League size clamping.** Size is clamped to [2, 20] on every write via `normalizeLeagueSettings`. Team names are padded with `"Team {n}"` or truncated to match.

**Weekly start limit normalization.** `weeklyStartLimit` is normalized to a positive integer or `null`. `0`, negative values, and non-finite values are treated as "no cap".

**Draft setup lock.** League resize, add/remove team, and reorder operations are blocked only once manual draft picks exist. Keeper-only state does not lock structure, so reserved keepers can be configured before the live draft and the team order can still be finalized afterward.

**Active group fallback.** Removing the active projection group falls back to the first remaining group's ID, or `null`. A stale `activeProjectionGroupId` is never left behind.

**Empty team name default.** Setting a team name to empty string (after trim) defaults to `"Team {index+1}"`. Out-of-bounds indices are silently ignored.

**Team index as string key.** `DraftState` records use string keys because JSON serialization (localStorage) requires it. All consumers must parse these back to numbers.

**Last league protection.** `deleteLeague` is a no-op when only one league remains.

## Action Categories

The store has ~25 actions organized into:
- **League management** — create, delete, duplicate, rename, set active, update active league
- **Projection management** — add, remove, set active, clear groups
- **Scoring** — full replacement or single-weight updates (operates on active league)
- **League settings** — settings replacement (with normalization), individual setters for size/names/roster (operates on active league)
- **Draft** — start session, draft player, undo last pick, assign/remove keepers with optional reserved rounds, reset (active league only), clear all
- **Eligibility** — apply eligibility map to a projection group

## Default Values

Default scoring uses ESPN-style weights. Default league is 12 teams with a standard roster (C, 1B, 2B, 3B, SS, 3×OF, UTIL, 7×P, 3 bench) and no weekly start cap. `mergeTwoWayRankings` defaults to `true`.

## Multi-League Behavior

**Active league resolution.** When reading `scoringSettings`, `leagueSettings`, or `draftState`, components derive them from the active league: `leagues.find(l => l.id === activeLeagueId) ?? leagues[0]`. The store initializes with a default "My League" if none exists.

**Shared projections.** Projection groups are shared across all leagues — uploading projections once makes them available for all leagues.

**Per-league draft state.** Each league maintains its own `draftState`. Switching leagues preserves each league's drafted players, keeper assignments, and live pick cursor independently.

**`clearAllData` behavior.** Clears all projections. Leagues and their draft states are preserved — only the draft picks and keepers are reset to empty.
