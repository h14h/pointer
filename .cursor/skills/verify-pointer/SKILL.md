---
name: verify-pointer
description: Drive DraftSpa (pointer) — the fantasy baseball/football draft web UI — to prove user-facing behavior. Use when verifying onboarding, league workspaces, Plan, Board, Intel, config, or live draft against a real browser.
---

# Verify DraftSpa (pointer)

DraftSpa is a local-first fantasy draft workspace (baseball + football). The
repo is `pointer`; persisted Zustand state is `pointer-storage` in IndexedDB
`pointer-db-v1`. Users touch a TanStack Start / Vite SPA in the browser. There
is no CLI product surface. Clerk + Convex Pro are optional and **off** for
verification unless a run explicitly opts in.

Write this skill for an agent that has never seen the app. Interview notes
that must not be guessed around:

- README says `bun dev` then `http://localhost:3000`. `vite.config.ts` defaults
  to **3200**. Playwright defaults to **3200** (`PW_PORT` override). Scenarios
  isolate on **3231**. This skill launches **3231** so it never steals a human
  Tidewave/dev session on 3000/3200.
- Vite binds **IPv6 localhost (`::1`) only**. `http://127.0.0.1:<port>`
  connection-refuses. Always use hostname `localhost`.
- Local shells can leak `TIDEWAVE_HTTPS_*`. Unset them or the server speaks
  HTTPS and HTTP health checks never resolve.
- `scripts/dev.ts` adds `--strictPort` whenever `--port` is passed. Two
  instances can run side by side on different ports. Same port: refuse.
- State is per-origin IndexedDB. Port A and port B do not share leagues.
  Two browsers on the same origin **do** share leagues. Drive only the
  instance this run launched, in a **fresh Playwright context**.

Human-language flows that match this map live in `scenarios/`. Coded locks
live in `e2e/`. Prefer those selectors over CSS or coordinates.

## Launch

From the repo root, after `bun` is on `PATH` and `bun install` has produced
`node_modules`:

```bash
.cursor/skills/verify-pointer/helpers/launch
```

That helper runs the documented isolation command:

```bash
env -u TIDEWAVE_HTTPS_KEY -u TIDEWAVE_HTTPS_CERT bun run dev -- --port 3231
```

(`VERIFY_POINTER_PORT` overrides the port. Explicit `--port` implies
`--strictPort` via `scripts/dev.ts`.)

**Ready signal (both must be true):**

1. Dev log contains `Local:   http://localhost:<port>/` (Vite prints
   `VITE v8.1.4  ready in …` immediately above).
2. `curl -fsS http://localhost:<port>/` returns HTTP 200. The HTML `<title>`
   is `DraftSpa — fantasy draft workspace` and the body references
   `virtual:tanstack-start-dev-client-entry`.

State file: `.cursor/skills/verify-pointer/.run/state.json` (PIDs, URL, port).
Log: `.cursor/skills/verify-pointer/.run/dev.log`.

**Teardown** — only the process group this helper started:

```bash
.cursor/skills/verify-pointer/helpers/cleanup
```

Do not `pkill bun`, `pkill vite`, or kill by process name. Cleanup removes
`.run/state.json`. It never deletes `evidence/`.

If `node_modules` is missing: `bun install` from the repo root, then
`bunx playwright install chromium` before driving.

## Doctor

Run first whenever anything looks off, and again on a fresh session before
the first drive:

```bash
.cursor/skills/verify-pointer/helpers/doctor
```

Read-only checks, all must pass:

| Check | Pass |
| --- | --- |
| Process up | `bun_pid` from state is alive |
| Port owned by us | listener on `VERIFY_POINTER_PORT` is a descendant of `bun_pid` (Vite is a child of `bunx` of `scripts/dev.ts`) |
| Right build | `GET http://localhost:<port>/` is 200, title is `DraftSpa — fantasy draft workspace`, HTML includes the TanStack Start Vite client entry |
| Auth valid | launch recorded `auth_mode=local-free` (no `VITE_CLERK_PUBLISHABLE_KEY`). Core flows do not require Sign in. `AccountControls` render nothing |

If doctor fails: run `helpers/cleanup`, then `helpers/launch`, then doctor
again. Do not drive a stranger on :3000 or :3200.

## Drive

Existing harness: **Playwright** (`@playwright/test`), the same library as
`e2e/league-url-contract.spec.ts` and `e2e/persistence-smoke.spec.ts`.
`browse` (`bun run browse:local`) is a secondary local Chromium CLI; do not
use it as the primary recipe. Vitest/`jsdom` is not a user path.

Always:

- Fresh `browser.newContext()` so IndexedDB is empty (first-time visitor)
  unless the feature file says otherwise.
- `baseURL` = the URL from `.run/state.json` (hostname `localhost`).
- Identify controls by **role + accessible name** from this repo, not
  coordinates or generated CSS classes.

Recipe helper (one mapped feature per invocation):

```bash
bun .cursor/skills/verify-pointer/helpers/drive.mjs league-onboarding
```

Other feature ids: `workspace-tabs`, `plan`, `board`, `intel`, `config`,
`live-draft`. Read `features/` before driving; the helper is a starter,
not a substitute for the map.

### Real handles (from `e2e/` + components)

| User thing | Handle |
| --- | --- |
| Onboarding sport | `getByRole("button", { name: /^Football$/i })` or `/^Baseball$/i` (`OnboardingHero`) |
| Fleet heading | `getByRole("heading", { name: "Leagues" })` |
| Open a league | `getByRole("link", { name: /open workspace/i })` → `/league/<id>/plan` |
| Live draft from card | `getByRole("button", { name: /live draft/i })` |
| Add league card | `getByRole("button", { name: /add a league/i })` |
| Add-league dialog | role `dialog`, title `Add a league`; textbox `getByLabel(/league name/i)`; sport `getByRole("button", { name: /^Baseball$/i })` / Football; submit `getByRole("button", { name: /create league/i })` (label `Create league`); dismiss `getByRole("button", { name: /^Close$/i })` |
| Export backup | `getByRole("button", { name: /export backup/i })` on the fleet (after onboarding) |
| Brand home | wordmark link (`DraftSpa` / `league-specific draft boards`) → `/` |
| Breadcrumb | `getByRole("link", { name: "leagues /" })` → `/` |
| Workspace tabs | `getByRole("link", { name: "Plan", exact: true })` (also `Board`, `Intel`, `Config`). Active tab: `nav a[aria-current="page"]` |
| Start draft | `getByRole("button", { name: /start live draft/i })` → `/league/<id>/draft` |
| Exit draft | `getByRole("button", { name: /exit live draft/i })` → `/plan` |
| Quick-log | `getByRole("textbox", { name: /log a pick/i })` (`aria-label="log a pick"`) |
| Draft tape | `getByRole("…", { name: /draft tape/ })` — `aria-label="draft tape — every pick in order"` |
| Board search (workspace) | `getByPlaceholder("Search players...")`. Football names render abbreviated (`J. Chase`, not `Ja'Marr Chase`) |
| Board position filter | `getByRole("button", { name: "Position" })` then option `QB` / `RB` / … / `All Positions` |
| Baseball player type | `getByRole("button", { name: "Player type" })` then `Pitchers` |
| Plan targets | `getByRole("textbox", { name: "Search players to flag as targets" })` |
| Slot note | `getByRole("textbox", { name: /Round 1 note/i })` |
| Intel upload | `getByRole("button", { name: /upload csv/i })` → dialog `Upload Football Projections` (football). Copy includes `All positions` |
| Config league name | label stamp `League name` wrapping an `input` (no aria-label) |
| Config your team | `getByRole("button", { name: "Your team" })` (`ariaLabel="Your team"`) |
| Football Reception | `getByRole("spinbutton", { name: "Reception points" })` (`type="number"`) |
| Baseball HR | `locator('input[aria-label="Home Runs (HR) points"]')` |
| Football preset | `getByRole("button", { name: "Football scoring preset" })` then `Apply Preset` |
| Delete league | `getByRole("button", { name: /delete league/i })` — native `window.confirm` |
| Pagination | buttons `Prev` / `Next`; text `Page 1 of …` |

Canonical routes (locked in `src/test/contracts/leagueRoutes/fixtures.ts`):

- `/` — fleet or onboarding
- `/league/<id>` and `/league/<id>/plan` — Plan
- `/league/<id>/board` — Board
- `/league/<id>/intel` — Intel
- `/league/<id>/config` — Config
- `/league/<id>/draft` — live draft takeover (no tab rail)
- unknown tab → Plan; unknown id → `/`
- `/leaderboard-visual` — Playwright golden fixture only, not a user path
- `/settings`, `/pricing`, `/privacy`, `/terms`, `/support` — secondary

Default football league name after onboarding: **My Football League**.
Baseball: **My Baseball League**. Built-in football source display name:
**2025 Football Prior-Year Stats**. Built-in baseball: **2025 Leaders**.

## Evidence

Write every proof under:

```
.cursor/skills/verify-pointer/evidence/<feature-id>-<ISO-timestamp>/
```

The helper sets this directory and writes `run-record.md`, `run-record.json`,
screenshots, and an ARIA snapshot. `helpers/cleanup` must not touch it.

Proof standards:

- Exercise the **real UI path** (hero button, tab link, quick-log). Do not
  seed Zustand via `page.evaluate`, Dexie writes, or test-only URLs except
  `/leaderboard-visual` when checking the golden table itself.
- Capture the **action and the resulting state**: screenshot (or ARIA
  snapshot) before the click and after. Record the URL both times.
- Verify **side effects**: after a mutate, reload or open a second view
  (fleet card ↔ workspace masthead; Plan timeline after a logged pick).
  Persistence is IndexedDB — a hard reload on the same origin is the
  second view. `e2e/persistence-smoke.spec.ts` is the coded form of this.
- Mocks only at production boundaries that already isolate (no Clerk/Polar
  in local-free mode). Public datasets are real static files under
  `/datasets/*`.
- Do not trust a toast or a “saved” label alone.

## Cleanup

```bash
.cursor/skills/verify-pointer/helpers/cleanup
```

Kills the `setsid` process group recorded in `.run/state.json` (`bun_pid` /
`pgid`), then deletes the state file. Leaves `evidence/` and the repo
untouched. If launch failed part-way, still run cleanup.

Never `pkill -f vite` or `killall bun`. A human may have Tidewave on :3200.

## Helpers

All scripts are executable. Invoke them from the repo root (or any cwd;
they resolve the repo via the skill path):

| Script | Invocation |
| --- | --- |
| Launch | `.cursor/skills/verify-pointer/helpers/launch` |
| Doctor | `.cursor/skills/verify-pointer/helpers/doctor` |
| Drive | `bun .cursor/skills/verify-pointer/helpers/drive.mjs <feature-id>` |
| Cleanup | `.cursor/skills/verify-pointer/helpers/cleanup` |

Shared defaults live in `helpers/common.sh` (sourced, not executed).

## Isolate

- **Yes**, two verification instances can run if they use different
  `VERIFY_POINTER_PORT` values. IndexedDB will not collide.
- **No**, do not attach Playwright to an already-running `bun run dev` on
  3000/3200 that this run did not start.
- Feature recipes that mutate state (rename, log a pick, delete) must use
  the isolated port + fresh context, or they corrupt a shared session.

## Feature map

Read `features/README.md`, then the file for the surface you are proving.
A run that only hits `/` when the map lists Board and Draft is incomplete.
