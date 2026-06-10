# Header

## Source Files
- `src/components/Header.tsx`
- `src/components/SportSwitcher.tsx` — segmented baseball/football mode control; see [onboarding.md](onboarding.md)

## Dependencies
- [State](state.md) — draft state, league settings, draft mode toggle
- [Public Datasets](public-datasets.md) — built-in baseline naming and protected projection behavior
- Next navigation (`next/link`, `next/navigation`) — settings route link and active-state styling
- [UI System](ui-system.md) — PillDropdown for projection/league selection, Toggle for draft mode, and shared page container tokens

## What It Does

Top navigation bar with two responsive modes. On large screens it exposes the global projection selector, league selector, a draft toggle, and the settings cog inline. On smaller screens it keeps the projection and league dropdowns plus a compact `Draft` toggle directly in the header, and it replaces the settings cog with a hamburger button that opens the settings-section navigator.

The header stays focused on global controls. Draft-specific context and actions now live in the leaderboard draft band and the Settings > Draft section.

On smaller screens, the hamburger drawer is the only settings-section navigator. It is available both on the leaderboard and on `/settings`, so users can jump straight into a section without a separate gear button.

## Draft Controls

- **Draft Mode toggle** remains in the header because it changes the entire leaderboard interaction model
- **Draft context / undo** live in the leaderboard's draft band
- **Reset Draft** lives in Settings > Draft alongside team and keeper management
- **Projection deletion** lives in Settings > Projections so destructive dataset cleanup stays next to rename, upload, and eligibility tools

## Projection Selection

- **Always visible trigger.** The projection dropdown remains visible even when there is only one dataset, because the label advertises that the leaderboard is driven by a selectable projection source rather than a fixed table.
- **Built-in naming override.** The protected public `historical-2025` dataset is presented as `2025 Leaders` in the header even though the underlying stored group name can remain more descriptive.
- **No destructive actions in-menu.** The dropdown is intentionally limited to selection and navigation; rename, delete, upload, and eligibility tools live in Settings > Projections.
