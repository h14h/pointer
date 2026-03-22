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
- **Version:** 5
- **Middleware:** Zustand `persist` to `localStorage`

Migrations handle upgrades from earlier versions: adding CG/ShO scoring fields (v3), migrating flat player arrays into projection groups, converting legacy `draftedIds`/`keeperIds` string arrays into the team-based record structure, and wrapping single-league data in a `League` object (v4→v5).

## Key Invariants

**Drafted/keeper mutual exclusivity.** `toggleDraftedForTeam` removes the player from keepers; `toggleKeeperForTeam` removes from drafted. A player cannot be both.

**League size clamping.** Size is clamped to [2, 20] on every write via `normalizeLeagueSettings`. Team names are padded with `"Team {n}"` or truncated to match.

**Weekly start limit normalization.** `weeklyStartLimit` is normalized to a positive integer or `null`. `0`, negative values, and non-finite values are treated as "no cap".

**Draft state pruning on resize.** When league settings change, draft picks assigned to team indices ≥ the new league size are removed. The active team index is also clamped.

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
- **Draft** — toggle drafted/keeper, set mode, reset (active league only), clear all
- **Eligibility** — apply eligibility map to a projection group

## Default Values

Default scoring uses ESPN-style weights. Default league is 12 teams with a standard roster (C, 1B, 2B, 3B, SS, 3×OF, UTIL, 7×P, 3 bench) and no weekly start cap. `mergeTwoWayRankings` defaults to `true`.

## Multi-League Behavior

**Active league resolution.** When reading `scoringSettings`, `leagueSettings`, or `draftState`, components derive them from the active league: `leagues.find(l => l.id === activeLeagueId) ?? leagues[0]`. The store initializes with a default "My League" if none exists.

**Shared projections.** Projection groups are shared across all leagues — uploading projections once makes them available for all leagues.

**Per-league draft state.** Each league maintains its own `draftState`. Switching leagues preserves each league's drafted/keeper players independently.

**`clearAllData` behavior.** Clears all projections. Leagues and their draft states are preserved — only the draft picks and keepers are reset to empty.
