# League onboarding

A first-time visitor sees a two-sport hero, picks Football or Baseball, and
lands on the Leagues fleet with one fully seeded league — no sign-up, no
CSV, no empty board.

## Sub-features

- `onboard-hero` shows DraftSpa + the first-league copy and exactly two sport buttons.
- `onboard-football` replaces the hero with a football league card in one click.
- `onboard-baseball` does the same for baseball (`2025 Leaders` source).
- `onboard-add` opens Add a league and appends a second card.
- `onboard-export` shows **Export backup** on the fleet (no import control).

## How to get to it (user POV)

- Open `http://localhost:<port>/` in a browser with no DraftSpa site data.
- From an already-onboarded fleet, there is no hero; use **add a league**
  for a second league only.

## Driving it with Playwright

Preconditions:

- Doctor is HEALTHY at `http://localhost:3231`.
- Fresh `browser.newContext()` (empty `pointer-db-v1`).
- `auth_mode=local-free`.

- **Hero.** `page.goto("/")` then `page.getByText(/Create your first league/i)`.
  Wordmark text `DraftSpa` and `league-specific draft boards` is visible.
  Buttons: `getByRole("button", { name: /^Football$/i })` and
  `getByRole("button", { name: /^Baseball$/i })`. No `Leagues` heading.
  Screenshot `01-onboarding-hero.png`.
- **Football.** Click Football. Wait for
  `getByRole("link", { name: /open workspace/i })`. Heading `Leagues`
  appears. Card title `My Football League`. Subtitle includes
  `12 teams` and `2025 Football Prior-Year Stats`. Actions: link
  `Open workspace`, button `Live draft`. Dashed button
  `getByRole("button", { name: /add a league/i })`. Stamp like
  `1 league · 1 sport`. URL path is `/`.
- **Add baseball.** Click add a league. Dialog title `Add a league`.
  Fill `getByLabel(/league name/i)` with `Sandlot Classic`. Click
  `getByRole("button", { name: /^Baseball$/i })` then
  `getByRole("button", { name: /create league/i })` (visible label
  `Create league`). A card `Sandlot Classic`
  with baseball vitals (`2025 Leaders`) appears. Brand stamp becomes
  `2 leagues · 2 sports`.
- **Export.** After the first card exists,
  `getByRole("button", { name: /export backup/i })` is on the fleet
  (local-save disclaimer copy sits to its left). Clicking it downloads
  `draftspa-backup-YYYY-MM-DD.json` — assert the button for the baseline
  recipe; catching the download is optional.
- **Proof.** Screenshot `02-fleet-after-football.png` (or after add) and
  ARIA dump. Both show `My Football League` and `Open workspace`.
  Helper: `bun .cursor/skills/verify-pointer/helpers/drive.mjs league-onboarding`.

## Gotchas

- Accessible names are `Football` / `Baseball`; the buttons look uppercase.
- `getByRole("button", { name: /baseball/i }).first()` is the hero;
  `.last()` is the Add-league sport toggle after the dialog is open
  (`e2e/league-url-contract.spec.ts`).
- Public-dataset bootstrap is async. Wait for `Open workspace` or the
  source name, not a timer. A card can briefly show `no source — visit intel`.
  A banner `Importing Eligibility` / `Applying 2025 position eligibility
  to the built-in leaders dataset.` can sit above the hero and the fleet
  while baseball eligibility still imports — do not treat that as a failed
  onboard.
- The add-league control's accessible name is `+ add a league`
  (`getByRole("button", { name: /add a league/i })` still matches).
- Reusing a context skips the hero (`hasOnboarded` is persisted). That is
  not a regression of `onboard-hero`.
- `/settings` and `/league/...` are not gated; only `/` shows the hero.
