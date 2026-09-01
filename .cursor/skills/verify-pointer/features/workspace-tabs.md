# Workspace tabs

A league workspace is one shell with four tabs — Plan, Board, Intel, Config —
plus a full-screen live-draft takeover. The URL always names the league and
tab; the browser back button retraces tab history.

## Sub-features

- `ws-open` opens a workspace on Plan at `/league/<id>/plan`.
- `ws-tabs` switches Board / Intel / Config / Plan and updates the path.
- `ws-back` retraces tab history with the browser back button.
- `ws-crumb` returns to the fleet via `leagues /`.

## How to get to it (user POV)

- Click **Open workspace** on a fleet card.
- Visit `/league/<id>`, `/league/<id>/plan`, `/board`, `/intel`, or `/config`.
- Click Plan / Board / Intel / Config in the workspace tab rail.

## Driving it with Playwright

Preconditions:

- Doctor HEALTHY. Fresh context, then complete `onboard-football`
  (or `drive.mjs league-onboarding` in the same context if you pass a
  reused context — default helper contexts are one-shot).
- A football league card is on `/`.

- **Open.** Click `getByRole("link", { name: /open workspace/i })`.
  Wait for `/\/league\/[^/]+/`. Heading is `My Football League`.
  Breadcrumb `getByRole("link", { name: "leagues /" })`. Chips include
  `NFL`, `12 teams`, `src · 2025 Football Prior-Year Stats`. Button
  `Start live draft`. Tab rail links `Plan`, `Board`, `Intel`, `Config`.
  `nav a[aria-current="page"]` text is `Plan`. URL ends in `/plan` or
  `/league/<id>` (bare id also renders Plan).
- **Board.** Click `getByRole("link", { name: "Board", exact: true })`.
  URL ends in `/board`. A `table tbody tr` appears. Pagination text
  matches `/Page 1 of/`.
- **Intel.** Click `Intel`. URL `/intel`. Heading `/football library/i`
  and a built-in row (`2025 Football Prior-Year Stats`, `Built-in`).
  Upload affordance `Upload CSV` (own sport) is present.
- **Config.** Click `Config`. URL `/config`. Headings: `League identity`,
  `Scoring`, `Roster`, `Draft order & keepers`, `Danger zone`.
- **Back.** After Plan → Board → Config, `page.goBack()` lands on Board
  (`aria-current` is `Board`).
- **Crumb.** Click `leagues /`. Path is `/`. Fleet cards return.
- **Proof.** Screenshots per tab; record each URL. Helper:
  `bun .cursor/skills/verify-pointer/helpers/drive.mjs workspace-tabs`.

## Gotchas

- Tab matching is case-sensitive. `/BOARD` falls back to Plan
  (`e2e/league-url-contract.spec.ts`).
- Extra trailing segments after a valid tab are ignored
  (`/board/extra` stays Board).
- Unknown league id client-redirects to `/`. Wait for the fleet, not a 404.
- Live draft is **not** a tab. `Start live draft` replaces the chrome;
  the tab rail is gone. See [live-draft.md](./live-draft.md).
- CSS shows `PLAN`; accessible name is `Plan`. Compare case-insensitively
  or use `exact: true` on the title-case name.
