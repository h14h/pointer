# Header

## Source Files
- `src/components/Header.tsx`

## Dependencies
- [State](state.md) — draft state, league settings, draft mode toggle
- Next navigation (`next/link`, `next/navigation`) — settings route link and active-state styling

## What It Does

Top navigation bar with upload trigger (passed as prop), settings cog route link (`/settings?section=scoring`), draft mode toggle, and a Clear Projections button.

When draft mode is on, a second row appears with active team selector, Next button (wraps via modulo in the store), draft status display, and a Reset Draft button.

## Confirmation Modals

Both destructive actions use the same pattern: fixed overlay with backdrop blur, close/cancel buttons, red-tinted confirm.

- **Reset Draft** — clears drafted players and keepers, leaves projection data intact
- **Delete Projections** — removes all projection groups and uploaded players (cannot be undone)

## Draft Status Display

- **Team:** `"{name}: {drafted + keepers}/{rosterTotal}"` with optional `"(K {keeperCount})"` suffix
- **League:** `"League: {N} drafted"` with optional `", {N} keepers"` suffix
- Missing team name falls back to `"Team {index + 1}"`
- `rosterTotal` = sum of all roster position slot counts + bench
