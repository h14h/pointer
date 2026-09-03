# DraftSpa (pointer) verification map

This directory is the maintained source for verifying DraftSpa's user-facing
behavior. Read this index before driving the app, then use the matching
feature file as the recipe.

## Baseline preconditions

- Launch with `.cursor/skills/verify-pointer/helpers/launch` so the app is
  at `http://localhost:3231` (or `$VERIFY_POINTER_PORT`) on a port this run
  owns. Ready signal: Vite `Local:   http://localhost:<port>/` and HTTP 200
  with title `DraftSpa — fantasy draft workspace`.
- Run `.cursor/skills/verify-pointer/helpers/doctor` and require HEALTHY
  (process up, port owned by our `bun_pid` tree, TanStack Start Vite HTML,
  `auth_mode=local-free`).
- Drive in a **fresh Playwright browser context** so IndexedDB `pointer-db-v1`
  is empty unless the feature file says otherwise. A reused profile is an
  already-onboarded user.
- Never drive an instance this run did not start. Do not attach to :3000 or
  :3200.
- Use hostname `localhost`, never `127.0.0.1` (Vite listens on `::1` only).
- Clerk is unconfigured. There is no Sign in button and no cloud sync.
- Built-in datasets load after hydration via `PublicDatasetBootstrap` from
  `/datasets/manifest.json` and `/datasets/{slug}.json`. Wait for league
  cards / the board table, not a fixed sleep, after onboarding.

## Driving conventions

- Start every recipe from the baseline (fresh context → onboarding hero)
  unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names from `e2e/` and the feature file.
  Visible labels are CSS-uppercased (`PLAN`) but accessible names stay
  title case (`Plan`).
- Treat quoted names as literal. `Open workspace` is a link; `Live draft`
  on the fleet card is a button; `Start live draft` is the workspace button.
- Run browser actions through Playwright (`page.getByRole` / `getByLabel` /
  `getByPlaceholder`) or `bun .cursor/skills/verify-pointer/helpers/drive.mjs <id>`.
- After a mutation, confirm a second user-facing view (reload, other tab,
  or fleet card). Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the DraftSpa
  wordmark or league masthead visible, plus the URL.
- Mutation proof includes a reload or a second surface that reads the same
  IndexedDB (fleet name after Config rename; Plan after a logged pick).
- Record the feature ID and entry point used with every artifact under
  `.cursor/skills/verify-pointer/evidence/<run-id>/`.
- Report an unreachable path with the attempted handle and the unmet
  precondition. Do not report a skipped entry point as verified through a
  different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the
user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with Playwright` starts with `Preconditions:` and uses labeled
   bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable
handles, required state, commands, and observable proof.

## Features

- [League onboarding](./league-onboarding.md) — first visit, sport pick, fleet, add a second league, export backup.
- [Workspace tabs](./workspace-tabs.md) — Plan / Board / Intel / Config URLs, back button, breadcrumb.
- [Plan](./plan.md) — pick timeline, targets, round notes.
- [Board](./board.md) — ranked table, search, position filter, pagination.
- [Intel](./intel.md) — projection library, Upload CSV, football mixed-file intake.
- [Config](./config.md) — identity, scoring, roster, danger zone, persistence.
- [Live draft](./live-draft.md) — takeover, quick-log, board log, undo, exit.
