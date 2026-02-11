# Scoring Form

## Source Files
- `src/components/ScoringForm.tsx`

## Dependencies
- [State](state.md) — scoring settings, league settings, merge toggle
- [Scoring](scoring.md) — `scoringPresets`, `presetNames`
- [Types](types.md) — `ScoringSettings`, `RosterSlot`, `LeagueSettings`
- [Utilities](utilities.md) — `useDebouncedCallback`
- `src/components/NumericInput.tsx` — standardized numeric control for scoring/roster fields

## How It Works

Modal for editing scoring weights, roster configuration, and team management. Opens with a local copy of league settings synced from the store. Numeric fields are standardized through `NumericInput` to keep layout, focus, and keyboard behavior consistent. Scoring weight changes apply to the store on commit (debounced). League settings are finalized on Done.

## Key Behaviors

**Debounced updates (150ms).** Three separate debounced callbacks handle batting scoring, pitching scoring, and league settings. This prevents excessive store updates while the user types.

**Local league settings copy.** The component maintains a local copy of `leagueSettings` synced from the store when the modal opens (via `useEffect` on `isOpen`). The Done button does a final `setLeagueSettings` call to ensure nothing is lost from the debounce window.

**Standardized numeric behavior.** Numeric controls render always-visible stepper arrows on the left side of the field, auto-select their full value on focus for direct overwrite typing, and keep steppers out of tab order. Users can move through fields using one `Tab` per numeric input.

**Commit model for numeric fields.** Numeric fields keep a local draft while typing and commit to parent handlers on blur/Enter/step action. Scoring commits route through the existing 150ms debounced scoring updater; roster commits route through the existing 150ms debounced league updater.

**Merge two-way toggle.** `canMergeTwoWay` requires the active projection group to have both batter and pitcher ID sources that are non-null and non-generated. When disabled, the toggle shows a tooltip explaining the requirement.

**Team drag-and-drop reorder.** Team order in this list sets draft order. Rows are HTML5 draggable. On drop, the team is spliced from its original index and inserted at the target index.

## Edge Cases
- Team count clamped 2–20 (Add Below disabled at 20, Remove disabled at 2)
- Roster position values clamped to `max(0, round(value || 0))`
- Preset dropdown stays in sync with external scoring changes via `useEffect` on `scoringSettings.name`
- Modal returns `null` when `!isOpen`
- Standardization in this pass is limited to numeric inputs; text/select controls are unchanged
