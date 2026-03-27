# Settings Page

## Source Files
- `src/app/settings/page.tsx`
- `src/components/settings/SettingsLayout.tsx`
- `src/components/settings/sectionNavigation.tsx`
- `src/components/settings/ProjectionsSection.tsx`
- `src/components/settings/ScoringSection.tsx`
- `src/components/settings/RosterSection.tsx`
- `src/components/settings/LeaguesSection.tsx`
- `src/components/settings/DraftSection.tsx`
- `src/components/settings/DraftTeamRow.tsx`
- `src/components/settings/constants.ts`
- `src/components/settings/types.ts`
- `src/components/NumericInputGroup.tsx`

## Dependencies
- [State](state.md) — scoring, league, draft, and merge-two-way state/actions
- [Scoring](scoring.md) — scoring presets
- [Types](types.md) — `ScoringSettings`, `RosterSlot`, `LeagueSettings`
- [Utilities](utilities.md) — debounced scoring updates
- [UI System](ui-system.md) — shared page shell, section header, labels, select styling, and grouped surface patterns
- `src/components/NumericInput.tsx` — low-level numeric input behavior
- `src/components/NumericInputGroup.tsx` — shared group/row wrappers used by both Scoring and Roster sections

## How It Works

Settings moved from a single modal to a dedicated `/settings` page. The page is split into independent sections selected by URL query: `?section=projections|scoring|roster|draft|leagues`. Invalid or missing values default to `scoring`.

Desktop renders a left sidebar section navigator. On smaller screens, section navigation moves into the global header drawer instead of adding a second in-page control, and the in-page sidebar disappears entirely. Both are link-driven so section state is shareable via URL, and both present the same labels, descriptions, and active-state treatment to keep the information architecture consistent across breakpoints.

## Key Behaviors

**Clean route cutover.** Header no longer opens a scoring modal; it links to `/settings?section=scoring` using an icon-only settings control.

**Projections section.** Projection management now lives here instead of being split between the upload modal and the leaderboard filter row. The section lists every projection group, highlights the active one, exposes upload/rename/delete where allowed, and provides retroactive eligibility import or re-run controls with a per-group season field. The built-in `2025 Leaders` group now auto-imports its own 2025 eligibility during bootstrap, while uploaded groups get an explicit danger zone inside their card so deletion remains visible without competing with the header controls.

**Scoring section.** Displays batting and pitching stats simultaneously in a two-column layout (batting left, pitching right; stacked on mobile with batting first). Stats are organized into semantic sub-groups (e.g., Hits, Run Production, Decisions, Relief) using `NumericInputGroup`, matching the roster section's visual grouping pattern. Keeps preset apply behavior, merge two-way toggle, and debounced numeric scoring updates.

**Roster section.** Keeps per-slot and reserve numeric controls with immediate commit-to-store behavior on input commit. Weekly start limits live in a separate `Pitcher Usage` callout with an explicit toggle plus a numeric input that is disabled until the rule is enabled. Uses the shared `NumericInputGroup` and `NumericInputRow` components for standard roster slots.

**Shared numeric input groups.** Both Scoring and Roster sections use `NumericInputGroup` (label bar + rounded background container) and `NumericInputRow` (label + NumericInput in a bordered row) from `src/components/NumericInputGroup.tsx` to maintain consistent visual grouping.

**Shared UI shell.** The route header, section navigation, preset select, and grouped controls now use the shared UI primitives instead of repeating hardcoded color/font/border recipes in each surface component.

**Draft section.** Uses a compact ordered list of team rows to manage league size, team names, team add/remove, explicit move-to-position draft order, keeper assignment from the active projection group, keeper cost rounds, and Reset Draft. Team order remains draft order, and keeper editing lives alongside each team rather than in a separate section below.

**Draft setup lock.** Once manual draft picks exist, draft order, add/remove, and league-size controls are disabled with an explanatory notice. Keeper-only state does not lock structure, so teams can still be reordered or resized before the live draft begins. The same notice owns the `Reset Draft` action, but only when there are manual picks to clear, so the recovery path appears only when it is immediately usable. Team renaming remains allowed because it does not remap ownership, and keeper add/remove stays available so users can correct keeper state mid-draft.

**Compact draft order rows.** Each team renders as a summary-first row with its current draft position, inline name field, collapsed keeper summary, and a shared `move to` position control. Reordering is explicit and immediate; drag-and-drop is no longer used.

**Collapsed keeper panels.** Team rows stay collapsed by default to keep the list dense. When collapsed, teams with no keepers show only `No Keepers`. Teams with keepers show one subtle badge per keeper using abbreviated first names plus round labels (for example `M. Betts • R5`), and the badges wrap as whole units onto additional lines when needed. Expanding a row reveals the existing keeper editor for that team only, and only one team can be expanded at a time.

**Keeper setup.** Keepers are assigned per team from the currently active projection group through a compact add control inside each team's keeper panel. New keepers land in the next open slot for that team. Existing keeper rows behave like numeric slot editors: the `Rd` input commits an explicit requested round, while the adjacent earlier/later controls move only that keeper to the nearest open round in that direction, skipping occupied rounds. Invalid, occupied, out-of-range, or already-passed slots are rejected with a toast and the input reverts. Rows stay in place while the user types and reorder only after a successful committed round change. When a committed round change reorders the list, the edited keeper snaps immediately and any non-edited keeper that moved fades in at its new position to make the reorder legible. Each keeper row shows its computed `Pick N` label inside the same control cluster. Assigned keepers appear in the team card, immediately become unavailable on the leaderboard, and reserved keeper slots are skipped by the live draft board.

**Behavior scenarios.** Complex Draft-section behaviors should be captured in short Given/When/Then scenarios in both the spec and the UI tests. For keeper round editing, the canonical example is one team with keepers in rounds 5 and 6:
- Given Alpha is round 5 and Beta is round 6, when I click Alpha's later arrow, then Alpha moves to round 7 and Beta stays round 6
- Given Alpha is round 5 and Beta is round 6, when I click Beta's earlier arrow, then Beta moves to round 4 and Alpha stays round 5
- Given Alpha is round 5 and Beta is round 6, when I commit Alpha to round 6, then the edit is rejected, Alpha reverts to round 5, and a toast explains the conflict
- Given the draft cursor has already passed a keeper slot, when I move or edit a keeper into that slot, then the change is rejected and the current assignment remains unchanged

**Reset Draft behavior.** Reset Draft only clears in-progress manual draft picks for the currently selected league. Keeper assignments and their reserved slots remain intact. The control is hidden when there are no manual picks to reset.

**Auto-save on commit.** There is no global Save button. Updates are persisted as each field commits.

## Edge Cases
- Section query fallback to `scoring` for invalid values
- Protected public projection groups can be selected and re-imported for eligibility, but they cannot be renamed or deleted
- Projection import season is editable per group and can diverge from the last successful eligibility-import season
- Team count constrained to 2–20
- Empty team names normalize to `Team {n}` on commit
- Roster values remain non-negative integers
- Team-order edits are blocked once manual draft picks exist
- Keeper assignment depends on a selected or default projection group
- Keeper cost rounds cannot reserve a slot that has already passed or that is already reserved by another keeper
- Keeper arrow controls move to the nearest open round rather than swapping or pushing other keepers
