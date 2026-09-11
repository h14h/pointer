# Board

The Board tab is the ranked player table for the current league: search,
position filter, pagination, and (football) projection overlays. Pick
logging is not on this tab — it lives in the live-draft room. Football
rows default to **live PAR ↓** (not raw points). Baseball stays on
projected points. Football and baseball tables share the search
placeholder and pagination words but not the same columns.

## Sub-features

- `board-table` renders ranked rows with PLAYER / POS / PTS / PAR (football; also #, Bye, ADP, and stat columns). Football default sort is PAR ↓ (header `PAR ↓`).
- `board-live-par` (football) — after picks are logged in live draft, returning here recomputes PAR from remaining demand. Once ~`leagueSize` QBs are logged in default 1QB, remaining QBs sort below WR/TE (paginate; they may be off page 1).
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
  Football PAR header reads `PAR ↓`. `Page 1 of` and `Next` are present.
  Screenshot `01-board-all.png`.
- **Page.** Click `getByRole("button", { name: "Next" })`. Pagination
  text matches `/Page 2 of/`. Then search (search can collapse paging).
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
- **Live PAR after draft (football).** Do not log picks here. Enter
  `/draft`, click filter `QB`, then `getByRole("button", { name: /^log /i })`
  twelve times (default 12-team 1QB). Exit → Board. All Positions: first
  available WR/TE stay near the top; paginate until the first available
  QB — its `#` and PAR are worse than those WR/TE (example: J. Dart
  `#52` PAR +81 vs P. Nacua `#5` +217 and T. McBride `#16` +158).
- **Proof.** Action screenshot (typed query) plus result screenshot (filtered
  row). Helper: `bun .cursor/skills/verify-pointer/helpers/drive.mjs board`
  (table + `PAR ↓`, Next → page 2, search `chase`, Position RB). Overlay
  is not in the starter helper — click a player name whose `title` ends
  in `edit overlays`. Live PAR saturation is the extra path above.

## Gotchas

- Football Board **abbreviates** names (`FootballLeaderboard.abbreviateName`):
  first initial + rest. Assert `J. Chase`, not `Ja'Marr Chase`. Search still
  matches the full stored name, so `chase` also hits Chase Brown.
- Workspace Board search has a **placeholder**, not an aria-label. Draft-room
  search is `aria-label="search the board"` — different surface.
- Baseball Board headers say **Points**, not PTS. Position there is
  multi-select with no `All Positions` option. `e2e/leaderboard.spec.ts`
  proves `/leaderboard-visual` (baseball fixture), not this tab.
- Workspace Board does **not** log picks. Store `isDraftMode` stays
  `false` in production; `/leaderboard-visual?variant=draft` is a golden
  fixture, not this tab. Log picks in [live-draft.md](./live-draft.md),
  then come back — drafted rows show a `D` chip and live PAR has already
  moved remaining QBs down.
- Do not use `/leaderboard-visual` to prove the Board tab. That page seeds
  a store fixture and skips onboarding.
- Position menus are custom dropdowns (`getByRole("button")` options), not
  native `<select>`.
- Pagination buttons are `Prev` / `Next` (not "Previous").
- Built-in football pool is hundreds of rows; `Page 1 of 28` was true on
  2026-07-10 and may drift if the dataset is regenerated. Assert `Page 1 of`
  plus a known player, not a fixed page count.
- The overlay dialog title is the player's **full** stored name (e.g.
  `Christian McCaffrey`), not the word "overlay". Description starts
  with `Replace uploaded projections`. Field labels gain ` · overlay`
  and the `OV` chip appear only after an override exists.
