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
- **Version:** 4
- **Middleware:** Zustand `persist` to `localStorage`

Migrations handle upgrades from earlier versions: adding CG/ShO scoring fields (v3), migrating flat player arrays into projection groups, and converting legacy `draftedIds`/`keeperIds` string arrays into the team-based record structure.

## Key Invariants

**Drafted/keeper mutual exclusivity.** `toggleDraftedForTeam` removes the player from keepers; `toggleKeeperForTeam` removes from drafted. A player cannot be both.

**League size clamping.** Size is clamped to [2, 20] on every write via `normalizeLeagueSettings`. Team names are padded with `"Team {n}"` or truncated to match.

**Draft state pruning on resize.** When league settings change, draft picks assigned to team indices ≥ the new league size are removed. The active team index is also clamped.

**Active group fallback.** Removing the active projection group falls back to the first remaining group's ID, or `null`. A stale `activeProjectionGroupId` is never left behind.

**Empty team name default.** Setting a team name to empty string (after trim) defaults to `"Team {index+1}"`. Out-of-bounds indices are silently ignored.

**Team index as string key.** `DraftState` records use string keys because JSON serialization (localStorage) requires it. All consumers must parse these back to numbers.

## Action Categories

The store has ~20 actions organized into:
- **Projection management** — add, remove, set active, clear groups
- **Scoring** — full replacement or single-weight updates
- **League** — settings replacement (with normalization), individual setters for size/names/roster, team advancement (modulo wrap)
- **Draft** — toggle drafted/keeper, set mode, reset, clear all
- **Eligibility** — apply eligibility map to a projection group

## Default Values

Default scoring uses ESPN-style weights. Default league is 12 teams with a standard roster (C, 1B, 2B, 3B, SS, 3×OF, UTIL, 7×P, 3 bench). `mergeTwoWayRankings` defaults to `true`.
