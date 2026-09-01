# Board

The Board tab is the ranked player table for the current league: search,
position filter, pagination, and (in draft mode) pick logging from the list.
Football and baseball tables share the search placeholder and pagination
words but not the same columns.

## Sub-features

- `board-table` renders ranked rows with PLAYER / POS / PTS / PAR (football; also #, Bye, ADP, and stat columns).
- `board-search` filters by `Search players...`. Names render abbreviated (`Ja'Marr Chase` → `J. Chase`).
- `board-position` filters via the Position dropdown.
- `board-page` pages with Prev / Next and `Page N of M`.
- `board-overlay` (football) — click a player name (`title` ends in `edit overlays`) to open the projection overlay editor. An `OV` chip (`Overridden projections — edit overlay`) appears only after overrides exist.

## How to get to it (user POV)

- Open a workspace and click **Board**.
- Visit `/league/<id>/board`.
- `/leaderboard-visual` is a **test fixture**, not a user entry. Use it only
  when checking the golden table itself.

## Driving it with Playwright

Preconditions:

- Doctor HEALTHY. Fresh context + football onboarding.
- Workspace Board tab (built-in `2025 Football Prior-Year Stats` attached).

- **Table.** Click `getByRole("link", { name: "Board", exact: true })`.
  Wait for `page.locator("table tbody tr").first()`. URL ends in `/board`.
  Visible column words include `PLAYER` / `POS` / `PTS` / `PAR` (stamped).
  `Page 1 of` and `Next` are present. Screenshot `01-board-all.png`.
- **Search.** `getByPlaceholder("Search players...").fill("chase")`.
  A row showing exact text `J. Chase` remains (abbreviated from Ja'Marr
  Chase). Search also matches other surnames (`C. Brown` = Chase Brown).
  Pagination can collapse to `Page 1 of 1`. Screenshot
  `02-board-search-chase.png`.
- **Position.** `getByRole("button", { name: "Position" }).click()` then
  `getByRole("button", { name: "RB", exact: true })`. Pagination resets
  toward `Page 1 of`. Football options: `All Positions`, `QB`, `RB`, `WR`,
  `TE`, `FLEX`, `K`, `DST`.
- **Baseball type (only on a baseball league).**
  `getByRole("button", { name: "Player type" })` then `Pitchers`. Wait for
  `th:has-text("ERA")` (`e2e/leaderboard.spec.ts`).
- **Proof.** Action screenshot (typed query) plus result screenshot (filtered
  row). Helper: `bun .cursor/skills/verify-pointer/helpers/drive.mjs board`.

## Gotchas

- Football Board **abbreviates** names (`FootballLeaderboard.abbreviateName`):
  first initial + rest. Assert `J. Chase`, not `Ja'Marr Chase`. Search still
  matches the full stored name, so `chase` also hits Chase Brown.
- Workspace Board search has a **placeholder**, not an aria-label. Draft-room
  search is `aria-label="search the board"` — different surface.
- Baseball Board headers say **Points**, not PTS. Position there is
  multi-select with no `All Positions` option. `e2e/leaderboard.spec.ts`
  proves `/leaderboard-visual` (baseball fixture), not this tab.
- Do not use `/leaderboard-visual` to prove the Board tab. That page seeds
  a store fixture and skips onboarding.
- Position menus are custom dropdowns (`getByRole("button")` options), not
  native `<select>`.
- Pagination buttons are `Prev` / `Next` (not "Previous").
- Built-in football pool is hundreds of rows; `Page 1 of 28` was true on
  2026-07-10 and may drift if the dataset is regenerated. Assert `Page 1 of`
  plus a known player, not a fixed page count.
