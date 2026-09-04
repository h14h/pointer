# Intel

The Intel tab is the sport-scoped projection library. Sources are
uploaded once per sport and shared by every league of that sport; the
current league only selects which source it uses. The current sport's
library is live; the other sport is read-only.

## Sub-features

- `intel-own` shows `{sport} library` with the built-in row selected after onboarding.
- `intel-other` shows the other sport's library (read-only upload hint).
- `intel-upload` exposes `Upload CSV` (empty library) or
  `Upload CSV — lands in the {sport} library…` (after a source exists).
- `intel-select` can switch the league onto another source via
  `Use for this league` (needs a second source of the same sport).

## How to get to it (user POV)

- Open a workspace and click **Intel**.
- Visit `/league/<id>/intel`.
- Legacy `/settings?section=projections` redirects here.

## Driving it with Playwright

Preconditions:

- Doctor HEALTHY. Fresh context + football onboarding.
- Built-in football dataset finished hydrating.

- **Own library.** Click `getByRole("link", { name: "Intel", exact: true })`.
  URL ends in `/intel`. Heading
  `getByRole("heading", { name: /football library/i })` (DOM text is
  lowercase `football library`; CSS stamps it). Built-in row heading
  `2025 Football Prior-Year Stats` with badge `Built-in` and chip
  `Selected`. `used by` includes `My Football League`. After bootstrap
  the baseball library often also has a `Built-in` row (`2025 Leaders`)
  — do not use a page-wide exact `getByText("Built-in")`.
- **Upload.** `getByRole("button", { name: /upload csv/i })` — after
  bootstrap the label is the long dashed-button copy, not exact
  `Upload CSV`.
- **Other library.** Heading `/baseball library/i` is present. Its
  upload hint is read-only (`uploads land here from any baseball
  league's Intel tab`) unless you opened a baseball league.
- **Proof.** Screenshot of both libraries. Helper:
  `bun .cursor/skills/verify-pointer/helpers/drive.mjs intel`.
  Do not require a real CSV upload for the baseline recipe.

## Gotchas

- Use `/football library/i`, not a visual `FOOTBALL LIBRARY` string.
- Built-in rows cannot be renamed or deleted (`rename` / delete ✕ are
  upload-only). `Use for this league` appears only when the row is not
  already the resolved source.
- A first-visit baseball library may still say `empty library` until
  `PublicDatasetBootstrap` finishes, or already show the built-in
  `2025 Leaders` row (`eligibility not imported` until that pipeline
  finishes). Wait for the football built-in row, not a timer. The
  eligibility banner can sit above the workspace — not a failed Intel
  load.
- Opening the upload dialog (`Upload Player Projections` /
  `Upload Football Projections`) is optional. Submit labels inside are
  `Import Group` variants — not the tab's `Upload CSV` text.
