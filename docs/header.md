# Header

## Purpose
Top navigation bar with upload and scoring modal triggers, draft mode toggle with animated switch, active team selection and advancement, draft status display, and confirmation modals for resetting draft picks and clearing all projection data.

## Source Files
- `src/components/Header.tsx`

## Dependencies
- `react` -- `useState`
- `@/store` -- `useStore` ([state spec](./state.md))

## Props
```ts
interface HeaderProps {
  onOpenUpload: () => void;
  onOpenScoring: () => void;
}
```

## State
| Variable | Type | Purpose |
|---|---|---|
| `isClearOpen` | `boolean` | Controls visibility of the "Delete all projections?" confirmation modal |
| `isResetOpen` | `boolean` | Controls visibility of the "Reset all draft picks?" confirmation modal |

## Store Bindings
**Read:** `isDraftMode`, `leagueSettings`, `draftState`

**Write:** `setDraftMode`, `setActiveTeamIndex`, `advanceActiveTeam`, `resetDraft`, `clearAllData`

## Key Computations

All derived values are computed inline (no `useMemo`):

| Name | Type | Derivation |
|---|---|---|
| `activeTeamIndex` | `number` | `draftState.activeTeamIndex` |
| `activeTeamName` | `string` | `leagueSettings.teamNames[activeTeamIndex] ?? "Team {n+1}"` |
| `draftedEntries` | `[string, number][]` | `Object.entries(draftState.draftedByTeam)` |
| `keeperEntries` | `[string, number][]` | `Object.entries(draftState.keeperByTeam)` |
| `draftedCount` | `number` | `draftedEntries.length` |
| `keeperCount` | `number` | `keeperEntries.length` |
| `teamDraftedCount` | `number` | Entries where `Number(teamIndex) === activeTeamIndex` |
| `teamKeeperCount` | `number` | Keeper entries where `Number(teamIndex) === activeTeamIndex` |
| `rosterTotal` | `number` | Sum of all `leagueSettings.roster.positions` values + `leagueSettings.roster.bench` |

## Event Handlers

| Interaction | Handler | Behavior |
|---|---|---|
| Upload button | `onClick` | Calls `onOpenUpload()` |
| Scoring button | `onClick` | Calls `onOpenScoring()` |
| Clear Projections button | `onClick` | Sets `isClearOpen` to true |
| Draft Mode toggle | `onClick` on switch button | Calls `setDraftMode(!isDraftMode)` |
| Active team select | `onChange` on select | Calls `setActiveTeamIndex(parseInt(value, 10))` |
| Next button | `onClick` | Calls `advanceActiveTeam()` (wraps around via modulo in store) |
| Reset Draft button | `onClick` | Sets `isResetOpen` to true |
| Reset Draft modal -- Cancel | `onClick` | Sets `isResetOpen` to false |
| Reset Draft modal -- Reset Draft | `onClick` | Calls `resetDraft()`, then sets `isResetOpen` to false |
| Clear modal -- Cancel | `onClick` | Sets `isClearOpen` to false |
| Clear modal -- Delete Projections | `onClick` | Calls `clearAllData()`, then sets `isClearOpen` to false |
| Modal close (x) buttons | `onClick` | Sets respective modal state to false |

## Layout

1. **Header bar** (`<header>` with bottom border):
   - **Title section**: "Pointer" `<h1>`, subtitle "Draft board for fantasy baseball projections"
   - **Button group**: Upload (emerald bg), Scoring (bordered), Clear Projections (red-tinted), Draft Mode toggle (label + animated switch)

2. **Draft controls** (conditional, only when `isDraftMode` is true):
   - Active Team label, team `<select>` dropdown, "Next" button
   - Status text: `"{activeTeamName}: {teamDraftedCount + teamKeeperCount}/{rosterTotal}"` with optional keeper count suffix `"(K {teamKeeperCount})"`
   - League status text: `"League: {draftedCount} drafted"` with optional `", {keeperCount} keepers"` suffix
   - "Reset Draft" button (right-aligned, red text)

3. **Reset Draft modal** (fixed overlay with backdrop blur):
   - Close (x) button
   - Heading: "Reset all draft picks?"
   - Description: "This clears drafted players and keepers, but leaves projection data intact."
   - Cancel and "Reset Draft" buttons (red-tinted confirm)

4. **Clear Projections modal** (fixed overlay with backdrop blur):
   - Close (x) button
   - Heading: "Delete all projections?"
   - Description: "This removes all projection groups and uploaded players. This cannot be undone."
   - Cancel and "Delete Projections" buttons (red-tinted confirm)

## Performance

No explicit performance optimizations (`useMemo`, `useCallback`, `memo`). The component is lightweight (~216 lines) and all derived values are cheap inline computations on small data structures (team arrays, draft entry objects).

## Edge Cases

| Condition | Behavior |
|---|---|
| Draft mode off | Draft controls section is not rendered |
| `keeperCount === 0` | Keeper suffix hidden in both team status and league status |
| `teamKeeperCount > 0` | Shows "(K {teamKeeperCount})" after roster count |
| Modal close | Both modals can be closed via the x button or Cancel button |
| Both modals use | Fixed overlay with `backdrop-blur-sm`, responsive sizing (full-screen on mobile, `max-w-md` centered card on `sm+`) |
| advanceActiveTeam | Wraps around to team 0 when past the last team (modulo logic lives in the store) |
| Missing team name | Falls back to `"Team {activeTeamIndex + 1}"` for display |
