# Settings Page

## Source Files
- `src/app/settings/page.tsx`
- `src/components/settings/SettingsLayout.tsx`
- `src/components/settings/ScoringSection.tsx`
- `src/components/settings/RosterSection.tsx`
- `src/components/settings/DraftSection.tsx`
- `src/components/settings/constants.ts`
- `src/components/settings/types.ts`

## Dependencies
- [State](state.md) — scoring, league, draft, and merge-two-way state/actions
- [Scoring](scoring.md) — scoring presets
- [Types](types.md) — `ScoringSettings`, `RosterSlot`, `LeagueSettings`
- [Utilities](utilities.md) — debounced scoring updates
- `src/components/NumericInput.tsx` — standardized numeric input behavior

## How It Works

Settings moved from a single modal to a dedicated `/settings` page. The page is split into independent sections selected by URL query: `?section=scoring|roster|draft`. Invalid or missing values default to `scoring`.

Desktop renders a left sidebar section navigator; mobile renders a top segmented navigator. Both are link-driven so section state is shareable via URL.

## Key Behaviors

**Clean route cutover.** Header no longer opens a scoring modal; it links to `/settings?section=scoring` using an icon-only settings control.

**Scoring section.** Keeps preset apply behavior, batting/pitching tab split, merge two-way toggle, and debounced numeric scoring updates.

**Roster section.** Keeps per-slot and reserve numeric controls with immediate commit-to-store behavior on input commit.

**Draft section.** Manages league size, team names, team add/remove, and drag-drop reorder. Team order remains draft order. League-size updates preserve clamping behavior and rely on store normalization/pruning.

**Auto-save on commit.** There is no global Save button. Updates are persisted as each field commits.

## Edge Cases
- Section query fallback to `scoring` for invalid values
- Team count constrained to 2–20
- Empty team names normalize to `Team {n}` on commit
- Roster values remain non-negative integers
- League resize still prunes draft assignments for removed teams through store invariants
