# Header

## Source Files
- `src/components/Header.tsx`

## Dependencies
- [State](state.md) — draft state, league settings, draft mode toggle
- Next navigation (`next/link`, `next/navigation`) — settings route link and active-state styling
- [UI System](ui-system.md) — shared buttons, dialogs, select styling, labels, and page container tokens

## What It Does

Top navigation bar with upload trigger (passed as prop), a settings cog that routes to `/settings?section=scoring` from the leaderboard and back to `/` from the settings page, draft mode toggle, and a Clear Projections button.

The header stays focused on global controls. Draft-specific context and actions now live in the leaderboard draft band and the Settings > Draft section.

## Confirmation Modals

Both destructive actions use the shared `DialogShell` pattern: fixed overlay, shared close affordance, ghost cancel action, destructive confirm action.

- **Reset Draft** — clears drafted players and keepers, leaves projection data intact
- **Delete Projections** — removes all projection groups and uploaded players (cannot be undone)

## Draft Controls

- **Draft Mode toggle** remains in the header because it changes the entire leaderboard interaction model
- **Draft context / undo** live in the leaderboard's draft band
- **Reset Draft** lives in Settings > Draft alongside team and keeper management
