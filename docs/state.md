# State Management

## Purpose

Central Zustand store managing all application state: projection groups, scoring settings, league configuration, and draft state. Persists to localStorage with versioned migration support.

## Source Files

- `src/store/index.ts`

## Dependencies

- [Types](types.md) — all major types (`Player`, `ProjectionGroup`, `ScoringSettings`, `LeagueSettings`, `DraftState`, `Eligibility`)
- Zustand (external) — state management with `persist` middleware

## Dependents

All UI components:
- [Leaderboard](leaderboard.md)
- [CSV Upload Workflow](csv-upload-workflow.md)
- [Scoring Form](scoring-form.md)
- [Header](header.md)

## State Shape

```typescript
{
  projectionGroups: ProjectionGroup[];
  activeProjectionGroupId: string | null;
  scoringSettings: ScoringSettings;
  leagueSettings: LeagueSettings;
  draftState: DraftState;
  isDraftMode: boolean;
  mergeTwoWayRankings: boolean;
}
```

## Actions

### Projection Management

#### `addProjectionGroup(group: ProjectionGroup): void`

Appends the group to `projectionGroups` and sets it as the active group via `activeProjectionGroupId`.

#### `setActiveProjectionGroup(id: string): void`

Sets `activeProjectionGroupId` to the given ID.

#### `clearProjectionGroups(): void`

Empties the `projectionGroups` array and sets `activeProjectionGroupId` to `null`.

#### `removeProjectionGroup(id: string): void`

Removes the group with the matching ID. If the removed group was the active group, falls back to the first remaining group's ID, or `null` if no groups remain.

### Scoring

#### `setScoringSettings(settings: ScoringSettings): void`

Full replacement of the scoring settings object.

#### `updateBattingScoring(key: string, value: number): void`

Updates a single batting weight by key.

#### `updatePitchingScoring(key: string, value: number): void`

Updates a single pitching weight by key.

### League

#### `setLeagueSettings(settings: LeagueSettings): void`

Full replacement of league settings. Normalizes settings (clamps size to 2-20, pads/trims team names, merges roster positions). Clamps draft state to valid team indices.

#### `setLeagueSize(size: number): void`

Updates the league size via the same normalization logic as `setLeagueSettings`. Applies the same draft state clamping.

#### `setTeamName(index: number, name: string): void`

Trims the name string. Empty string defaults to `"Team {index+1}"`. Ignores out-of-bounds index.

#### `setRosterSettings(roster): void`

Normalizes roster settings via `normalizeLeagueSettings`.

#### `setActiveTeamIndex(index: number): void`

Clamps the index to `[0, leagueSize - 1]`.

#### `advanceActiveTeam(): void`

Advances to the next team: `(activeTeamIndex + 1) % leagueSize`.

### Draft

#### `toggleDraftedForTeam(playerId: string, teamIndex: number): void`

Toggles a player's drafted status for a team. If newly drafted, removes the player from keepers. Team index is stored as a string key.

#### `toggleKeeperForTeam(playerId: string, teamIndex: number): void`

Toggles a player's keeper status for a team. If newly marked as keeper, removes the player from drafted.

#### `setDraftMode(enabled: boolean): void`

Sets `isDraftMode`.

#### `setMergeTwoWayRankings(enabled: boolean): void`

Sets `mergeTwoWayRankings`.

#### `resetDraft(): void`

Clears `draftedByTeam` and `keeperByTeam` records. Resets `activeTeamIndex` to 0.

#### `clearAllData(): void`

Clears projection groups and draft state.

### Eligibility

#### `applyEligibilityForGroup(groupId: string, eligibilityById: Map<string, Eligibility>, season: number): void`

Updates eligibility on all players in the matching projection group. Sets `eligibilityImportedAt` timestamp and `eligibilitySeason` on the group.

## Constants

### `defaultScoringSettings`

ESPN-style defaults:

```
batting:
  R=1, H=0, 1B=1, 2B=2, 3B=3, HR=4, RBI=1, SB=1, CS=-1, BB=1, SO=-1, HBP=1, SF=0, GDP=0

pitching:
  IP=3, W=5, L=-5, QS=3, CG=0, ShO=0, SV=5, BS=-3, HLD=2, SO=1, H=-1, ER=-2, HR=-1, BB=-1, HBP=-1
```

### `defaultRosterSettings`

```
C: 1, 1B: 1, 2B: 1, 3B: 1, SS: 1, OF: 3, UTIL: 1, P: 7, bench: 3
LF: 0, CF: 0, RF: 0, DH: 0, CI: 0, MI: 0, IF: 0, SP: 0, RP: 0, IL: 0, NA: 0
```

### `defaultLeagueSettings`

```
size: 12
teamNames: ["Team 1", "Team 2", ..., "Team 12"]
rosterSettings: defaultRosterSettings
```

### `initialMergeTwoWayRankings`

```typescript
true
```

## Persistence

- **Storage key:** `"pointer-storage"`
- **Version:** `4`
- **Middleware:** Zustand `persist` to `localStorage`

## Migration Logic (version < 4)

The store includes migration logic for upgrading persisted state from older versions:

1. **Scoring settings (v3):** Ensures `pitching.CG` and `pitching.ShO` exist in scoring settings (these fields were added in v3).

2. **Projection groups (legacy):** Migrates legacy flat `batters`/`pitchers`/`twoWayPlayers` arrays into a single `ProjectionGroup` named `"Imported"`.

3. **Draft state (legacy):** Migrates legacy `draftedIds`/`keeperIds` string arrays into the team-based `draftedByTeam`/`keeperByTeam` record structure (all legacy entries assigned to team `"0"`).

4. **Normalization:** Normalizes league settings and clamps draft state to valid team indices after migration.

## Edge Cases

- **League size clamping:** Size is clamped to the range [2, 20] via `normalizeLeagueSettings`.
- **Team name padding/trimming:** If `teamNames` array is shorter than `leagueSize`, missing names are filled with `"Team {n}"`. If longer, excess names are truncated.
- **Draft state clamping on resize:** When league size changes, orphaned draft picks (assigned to team indices >= new size) are removed.
- **Mutual exclusivity of drafted/keeper:** `toggleDraftedForTeam` removes the player from keepers, and `toggleKeeperForTeam` removes from drafted. A player cannot be both drafted and a keeper simultaneously.
- **Team index as string key:** `DraftState` uses `Record<string, string>` where the key is the player ID and the value is the stringified team index. This is a consequence of JSON serialization in localStorage.
- **Active group fallback:** When removing the active projection group, the store falls back to the first remaining group or `null`, never leaving a stale ID.
- **Empty team name default:** Setting a team name to an empty string (after trim) defaults to `"Team {index+1}"` rather than storing an empty string.
- **Out-of-bounds team name:** `setTeamName` silently ignores indices outside the valid range.
