# Intel

The Intel tab is the sport-scoped projection library. Built-in and uploaded
sources live here; the current league picks which source scores its Board
and Plan. Football and baseball each have their own library.

## Sub-features

- `intel-library` lists this sport's sources (`2025 Football Prior-Year Stats`
  / `2025 Leaders`) with a `Built-in` kind chip.
- `intel-upload` opens **Upload CSV** into a sport-specific dialog.
- `intel-mixed` (football) — the dialog offers **All positions (mixed file)**
  as well as per-position files.

## How to get to it (user POV)

- Open a workspace and click **Intel**.
- Visit `/league/<id>/intel`.
- Legacy `/settings?section=projections` redirects here.

## Driving it with Playwright

Preconditions:

- Doctor HEALTHY. Fresh context + football onboarding.
- Workspace Intel tab.

- **Library.** Click `getByRole("link", { name: "Intel", exact: true })`.
  URL ends in `/intel`. Heading `/football library/i`. Library row heading
  `getByRole("heading", { name: /2025 Football Prior-Year Stats/ })` with
  chip/text `Built-in`. Do not use bare `getByText` for the source name —
  the masthead chip also contains it.
  Own-sport upload: `getByRole("button", { name: /upload csv/i })`.
- **Upload (football).** Click Upload CSV. Dialog title
  `Upload Football Projections`. Copy mentions `All positions` / mixed CSV
  and `Browse Files`. Dismiss with `getByRole("button", { name: /^Close$/i })`
  or Escape. Do not need to attach a file to prove the intake is reachable.
- **Baseball library (only on a baseball league).** Heading
  `/baseball library/i` and built-in `2025 Leaders`. Upload opens the
  baseball CSV dialog, not the football one.
- **Proof.** Screenshot of the library plus the open upload dialog.
  Helper: `bun .cursor/skills/verify-pointer/helpers/drive.mjs intel`.

## Gotchas

- Upload is sport-scoped. A football league can see the baseball library
  read-only (`open a baseball league to upload here`).
- Built-in groups are protected — do not expect a delete control on
  `2025 Football Prior-Year Stats` / `2025 Leaders`.
- Mixed-file football CSVs default to per-row positions when Pos is absent.
  Proving parse behavior needs a real file; this map only requires the
  All-positions intake to exist.
- Public-dataset bootstrap is async. Wait for the built-in row, not a timer.
