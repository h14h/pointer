# Settings Page

## Source Files
- `src/app/settings/page.tsx`
- `src/components/settings/SettingsLayout.tsx`
- `src/components/settings/ScoringSection.tsx`
- `src/components/settings/RosterSection.tsx`
- `src/components/settings/DraftSection.tsx`
- `src/components/settings/constants.ts`
- `src/components/settings/types.ts`
- `src/components/NumericInputGroup.tsx`

## Dependencies
- [State](state.md) — scoring, league, draft, and merge-two-way state/actions
- [Scoring](scoring.md) — scoring presets
- [Types](types.md) — `ScoringSettings`, `RosterSlot`, `LeagueSettings`
- [Utilities](utilities.md) — debounced scoring updates
- `src/components/NumericInput.tsx` — low-level numeric input behavior
- `src/components/NumericInputGroup.tsx` — shared group/row wrappers used by both Scoring and Roster sections

## How It Works

Settings moved from a single modal to a dedicated `/settings` page. The page is split into independent sections selected by URL query: `?section=scoring|roster|draft`. Invalid or missing values default to `scoring`.

Desktop renders a left sidebar section navigator; mobile renders a top segmented navigator. Both are link-driven so section state is shareable via URL.

## Key Behaviors

**Clean route cutover.** Header no longer opens a scoring modal; it links to `/settings?section=scoring` using an icon-only settings control.

**Scoring section.** Displays batting and pitching stats simultaneously in a two-column layout (batting left, pitching right; stacked on mobile with batting first). Stats are organized into semantic sub-groups (e.g., Hits, Run Production, Decisions, Relief) using `NumericInputGroup`, matching the roster section's visual grouping pattern. Keeps preset apply behavior, merge two-way toggle, and debounced numeric scoring updates.

**Roster section.** Keeps per-slot and reserve numeric controls with immediate commit-to-store behavior on input commit. Weekly start limits live in a separate `Pitcher Usage` callout with an explicit toggle plus a numeric input that is disabled until the rule is enabled. Uses the shared `NumericInputGroup` and `NumericInputRow` components for standard roster slots.

**Shared numeric input groups.** Both Scoring and Roster sections use `NumericInputGroup` (label bar + rounded background container) and `NumericInputRow` (label + NumericInput in a bordered row) from `src/components/NumericInputGroup.tsx` to maintain consistent visual grouping.

**Draft section.** Manages league size, team names, team add/remove, and drag-drop reorder. Team order remains draft order. League-size updates preserve clamping behavior and rely on store normalization/pruning.

**Auto-save on commit.** There is no global Save button. Updates are persisted as each field commits.

## Edge Cases
- Section query fallback to `scoring` for invalid values
- Team count constrained to 2–20
- Empty team names normalize to `Team {n}` on commit
- Roster values remain non-negative integers
- League resize still prunes draft assignments for removed teams through store invariants
