# Scoring Form

## Purpose
Modal for editing scoring weights per stat category, applying scoring presets, configuring roster position slots, and managing teams with drag-and-drop reordering. Scoring and roster changes are debounced and applied to the store in real time; league settings are finalized on close via the "Done" button.

## Source Files
- `src/components/ScoringForm.tsx`

## Dependencies
- `react` -- `useState`, `useCallback`, `useEffect`
- `@/store` -- `useStore` ([state spec](./state.md))
- `@/lib/presets` -- `scoringPresets`, `presetNames` ([scoring spec](./scoring.md))
- `@/lib/useDebounce` -- `useDebouncedCallback` ([utilities spec](./utilities.md))
- `@/types` -- `ScoringSettings`, `RosterSlot`, `LeagueSettings` ([types spec](./types.md))

## Props
```ts
interface ScoringFormProps {
  isOpen: boolean;
  onClose: () => void;
}
```

## State
| Variable | Type | Purpose |
|---|---|---|
| `tab` | `"batting" \| "pitching"` | Active scoring category tab |
| `presetSelection` | `string` | Currently selected preset key in the dropdown |
| `localLeagueSettings` | `LeagueSettings` | Local copy of league settings, synced to the store on Done or debounced updates |
| `draggingTeamIndex` | `number \| null` | Index of the team row currently being dragged |
| `dragOverTeamIndex` | `number \| null` | Index of the team row currently hovered during drag |

### Derived Values (not state)
| Variable | Type | Purpose |
|---|---|---|
| `activeGroup` | `ProjectionGroup \| null` | The active projection group, used to determine `canMergeTwoWay` |
| `canMergeTwoWay` | `boolean` | True when the active group has both batter and pitcher ID sources that are non-null and non-generated |

## Store Bindings
**Read:** `scoringSettings`, `leagueSettings`, `projectionGroups`, `activeProjectionGroupId`, `mergeTwoWayRankings`

**Write:** `setScoringSettings`, `updateBattingScoring`, `updatePitchingScoring`, `setLeagueSettings`, `setMergeTwoWayRankings`

## Key Computations

| Name | Description |
|---|---|
| `debouncedUpdateBatting` | `useDebouncedCallback(150ms)` wrapping `updateBattingScoring(key, value)` -- debounces individual batting stat weight changes |
| `debouncedUpdatePitching` | `useDebouncedCallback(150ms)` wrapping `updatePitchingScoring(key, value)` -- debounces individual pitching stat weight changes |
| `debouncedUpdateLeague` | `useDebouncedCallback(150ms)` wrapping `setLeagueSettings(next)` -- debounces roster and team name changes |
| `normalizeLocalLeagueSettings` | Clamps team count between 2-20, pads with default names if needed, truncates if over |
| `handlePreset` | Looks up `scoringPresets[presetKey]` and calls `setScoringSettings` with the full preset |
| `handleRosterChange` | Updates a single roster position slot in `localLeagueSettings`, then fires debounced update |
| `handleBenchChange` | Updates bench count in `localLeagueSettings`, then fires debounced update |
| `handleTeamNameChange` | Updates a team name at index, normalizes, then fires debounced update |
| `handleAddTeamBelow` | Splices a new team name at `index + 1` with default name `"Team {n+1}"` |
| `handleRemoveTeamAt` | Filters out team at index |
| `handleMoveTeam` | Swaps a team with its neighbor in the given direction (-1 or 1) |
| `handleMoveTeamToIndex` | Splices a team from one index and inserts at another (used by drag-drop) |

## Event Handlers

| Interaction | Handler | Behavior |
|---|---|---|
| Preset select | `onChange` on select | Sets `presetSelection` |
| Apply Preset button | `onClick` | Calls `handlePreset(presetSelection)` to apply full preset to store |
| Batting/Pitching tab toggle | `onClick` on tab buttons | Sets `tab` |
| Merge two-way toggle | `onClick` on switch button | Calls `setMergeTwoWayRankings(!mergeTwoWayRankings)` if `canMergeTwoWay` |
| Scoring weight input | `onChange` on number input | Calls `debouncedUpdateBatting` or `debouncedUpdatePitching` with parsed float |
| Roster position input | `onChange` on number input | Calls `handleRosterChange(slot, value)` |
| Bench input | `onChange` on number input | Calls `handleBenchChange(value)` |
| Team name input | `onChange` on text input | Calls `handleTeamNameChange(index, value)` |
| Add Below button | `onClick` | Calls `handleAddTeamBelow(index)` |
| Remove button | `onClick` | Calls `handleRemoveTeamAt(index)` |
| Team row drag start | `onDragStart` | Sets `draggingTeamIndex` |
| Team row drag end | `onDragEnd` | Clears `draggingTeamIndex` and `dragOverTeamIndex` |
| Team row drag over | `onDragOver` | `preventDefault`, sets `dragOverTeamIndex` |
| Team row drop | `onDrop` | Calls `handleMoveTeamToIndex(draggingTeamIndex, index)`, clears drag state |
| Close / x button | `onClick` | Calls `onClose` |
| Done button | `onClick` | Calls `setLeagueSettings(localLeagueSettings)`, then `onClose` |

## Layout

1. **Header bar** (sticky top with background):
   - Title "Scoring & League" with subtitle
   - Preset selector dropdown and "Apply Preset" button

2. **Scoring section** (rounded card):
   - Section header with title and description
   - Batting/Pitching tab toggle (pill-shaped switcher)
   - Merge two-way toggle (switch with hint tooltip when disabled)
   - 1-2 column grid of stat inputs:
     - Batting tab: 14 categories (H, 1B, 2B, 3B, HR, R, RBI, BB, HBP, SO, SB, CS, SF, GDP) with number inputs (step 0.5)
     - Pitching tab: 15 categories (IP, SO, H, ER, HR, BB, HBP, W, L, QS, SV, HLD, BS, CG, ShO) with number inputs (step 0.5)
   - Input `key` prop includes `scoringSettings.name` to force fresh `defaultValue` on preset change

3. **League & Draft section** (rounded card):
   - Section header: "League & Draft"
   - **Roster configuration** -- two-panel grid layout:
     - Left panel (position groups): Outfield (LF, CF, RF), Infield (3B, SS, 2B, 1B), Flex (OF, CI, MI, IF, UTIL, DH) -- each as a labeled grid of count inputs
     - Right panel: Pitchers (SP, RP, P), Catchers (C) -- vertical list of labeled count inputs
   - **Bench + Reserve row**: Bench, IL, NA inputs in a 3-column grid
   - **Team management**:
     - Header: "Teams (count)" with "Order here sets draft order" hint
     - Draggable team rows: drag handle, team name text input, Add Below button, Remove button
     - Team index label (T1, T2, etc.)

4. **Footer bar** (sticky bottom with background):
   - Info text: "Changes apply immediately to scoring and league settings."
   - "Done" button

## Performance

| Technique | Where | Purpose |
|---|---|---|
| `useDebouncedCallback(150ms)` | Batting scoring, pitching scoring, league settings | Prevents excessive store updates and re-renders while user types |
| `useEffect` on `isOpen` | Syncs `localLeagueSettings` from store | Ensures fresh local state when modal opens |
| `useEffect` on `scoringSettings.name` | Syncs `presetSelection` | Keeps preset dropdown in sync when settings change externally |
| Input `key` prop | Scoring number inputs | `key={`batting-${key}-${scoringSettings.name}`}` forces re-mount with fresh `defaultValue` when preset changes |

## Edge Cases

| Condition | Behavior |
|---|---|
| `!isOpen` | Returns `null` (no rendering) |
| Team count at 20 | "Add Below" buttons disabled with `disabled:cursor-not-allowed disabled:opacity-50` |
| Team count at 2 | "Remove" buttons disabled |
| Drag-over highlight | Target row gets emerald border and background |
| Dragging row | Source row gets `opacity-60` |
| Merge two-way disabled | Switch is `opacity-50 cursor-not-allowed`; `aria-disabled` set; container has `title` tooltip explaining requirement |
| Empty team name | No explicit validation; the team name text input can be blank |
| Roster position value | Clamped to `Math.max(0, Math.round(value \|\| 0))` on each change |
| Preset application | `setScoringSettings` replaces the entire scoring object; input `key` prop forces re-mount to pick up new `defaultValue` |
| Done button | Calls `setLeagueSettings` with the full `localLeagueSettings` (final sync) before closing |
