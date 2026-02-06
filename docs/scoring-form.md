# Scoring Form

## Source Files
- `src/components/ScoringForm.tsx`

## Dependencies
- [State](state.md) — scoring settings, league settings, merge toggle
- [Scoring](scoring.md) — `scoringPresets`, `presetNames`
- [Types](types.md) — `ScoringSettings`, `RosterSlot`, `LeagueSettings`
- [Utilities](utilities.md) — `useDebouncedCallback`

## How It Works

Modal for editing scoring weights, roster configuration, and team management. Opens with a local copy of league settings synced from the store. Scoring weight changes apply to the store immediately (debounced). League settings are finalized on Done.

## Key Behaviors

**Debounced updates (150ms).** Three separate debounced callbacks handle batting scoring, pitching scoring, and league settings. This prevents excessive store updates while the user types.

**Local league settings copy.** The component maintains a local copy of `leagueSettings` synced from the store when the modal opens (via `useEffect` on `isOpen`). The Done button does a final `setLeagueSettings` call to ensure nothing is lost from the debounce window.

**Input `key` prop for preset changes.** Scoring number inputs use a `key` prop that includes `scoringSettings.name` (e.g., `` key={`batting-HR-${scoringSettings.name}`} ``). This forces React to re-mount inputs with fresh `defaultValue` when a preset is applied — without this, inputs would show stale values because `defaultValue` only applies on mount.

**Merge two-way toggle.** `canMergeTwoWay` requires the active projection group to have both batter and pitcher ID sources that are non-null and non-generated. When disabled, the toggle shows a tooltip explaining the requirement.

**Team drag-and-drop reorder.** Team order in this list sets draft order. Rows are HTML5 draggable. On drop, the team is spliced from its original index and inserted at the target index.

## Edge Cases
- Team count clamped 2–20 (Add Below disabled at 20, Remove disabled at 2)
- Roster position values clamped to `max(0, round(value || 0))`
- Preset dropdown stays in sync with external scoring changes via `useEffect` on `scoringSettings.name`
- Modal returns `null` when `!isOpen`
