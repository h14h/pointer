# Live draft

Live draft is a full-screen night-mode takeover for logging every pick
against the league board. Nothing auto-advances. Exit returns to Plan.

## Sub-features

- `draft-enter` opens `/league/<id>/draft` without the workspace tab rail.
- `draft-quicklog` types a name in `log a pick` and confirms with Enter.
- `draft-boardlog` logs from a row (`aria-label="log <name>"`).
- `draft-undo` reverses the last pick (`undo` next to the receipt).
- `draft-exit` returns to `/plan` via `Exit live draft`.

## How to get to it (user POV)

- Click **Start live draft** in the workspace masthead.
- Click **Live draft** on a fleet card.
- Visit `/league/<id>/draft`.

## Driving it with Playwright

Preconditions:

- Doctor HEALTHY. Fresh context + football onboarding (12 teams, Team 1
  is you, built-in pool loaded).
- From Plan or the fleet card.

- **Enter.** Click `getByRole("button", { name: /start live draft/i })`.
  URL ends in `/draft`. `getByRole("textbox", { name: /log a pick/i })`
  is visible. `nav a[aria-current="page"]` count is 0. League masthead
  heading count is 0 (`e2e/league-url-contract.spec.ts` draft-room
  outcome). Tape: `getByLabel(/draft tape/i)`. Top strip includes
  `Exit live draft` and pick progress (`PICK 1`, `on the clock`).
- **Quick-log.** Focus is already in the textbox (placeholder
  `log a pick — type a name, Enter confirms to Team 1`). Type `mccaffrey`
  and press Enter, or press Enter on the empty box to take
  `recommend: …`. Receipt text matches `/logged: p1/`. Strip advances
  to pick 2. The logged name leaves the board list.
- **Board log.** `getByRole("button", { name: /^log /i })` on a row
  (`aria-label="log ${player.name}"`) logs that player to the on-clock
  team.
- **Undo.** Click `getByRole("button", { name: /^undo$/i })` beside the
  receipt. Pick number steps back; the player returns to the board.
- **Exit.** Click `getByRole("button", { name: /exit live draft/i })`.
  URL ends in `/plan`. Tab rail returns. A logged slot on Plan reads
  `logged` with the player name.
- **Proof.** Screenshot in the room (sync strip + receipt) and after
  exit (Plan timeline). Helper:
  `bun .cursor/skills/verify-pointer/helpers/drive.mjs live-draft`
  (enter/exit only; extend the script for log/undo).

## Gotchas

- `/` on the keyboard refocuses the quick-log unless an input already
  has focus (`QuickLog.tsx`).
- Default team abbreviations on the tape collide (`Team 1` / `Team 10`
  / `Team 11` / `Team 12` all look like `T1`). Assert overall pick
  number and player name, not tape initials
  (`scenarios/draft-room.md`).
- Workspace Board's `Undo Last Pick` is a different control from the
  draft-room `undo` receipt action.
- Re-entering `/draft` resumes the same IndexedDB pick index. A fresh
  context is a new league with zero picks.
- Night-mode transition (`beginNightTransition`) can veil the first
  paint; wait for the log textbox, not the URL alone.
