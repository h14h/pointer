# Header

## Source Files
- `src/components/Header.tsx`

## Dependencies
- [State](state.md) — draft state, league settings, draft mode toggle
- [Public Datasets](public-datasets.md) — built-in baseline naming and protected projection behavior
- Next navigation (`next/link`, `next/navigation`) — settings route link and active-state styling
- [UI System](ui-system.md) — shared buttons, dialogs, select styling, labels, and page container tokens

## What It Does

Top navigation bar with two global context selectors — active projection group and active league — plus draft mode and the settings cog. The projection dropdown is now the primary discovery point for dataset management: it always shows the current dataset label (for example `2025 Leaders`) and ends with a `Manage Projections...` link into Settings.

The header stays focused on global controls. Draft-specific context and actions now live in the leaderboard draft band and the Settings > Draft section.

## Draft Controls

- **Draft Mode toggle** remains in the header because it changes the entire leaderboard interaction model
- **Draft context / undo** live in the leaderboard's draft band
- **Reset Draft** lives in Settings > Draft alongside team and keeper management
- **Projection deletion** lives in Settings > Projections so destructive dataset cleanup stays next to rename, upload, and eligibility tools

## Projection Selection

- **Always visible trigger.** The projection dropdown remains visible even when there is only one dataset, because the label advertises that the leaderboard is driven by a selectable projection source rather than a fixed table.
- **Built-in naming override.** The protected public `historical-2025` dataset is presented as `2025 Leaders` in the header even though the underlying stored group name can remain more descriptive.
- **No destructive actions in-menu.** The dropdown is intentionally limited to selection and navigation; rename, delete, upload, and eligibility tools live in Settings > Projections.
