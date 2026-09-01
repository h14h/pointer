# Config

The Config tab is the league's settings: identity, scoring, roster, draft
order & keepers, and the danger zone. Edits save on blur or stepper commit
— there is no Save button — and re-derive Board scores and the Plan
timeline.

## Sub-features

- `config-identity` renames the league and changes Your team.
- `config-scoring` edits a weight or applies a preset.
- `config-roster` changes slot counts (football steppers / baseball slots).
- `config-danger` duplicates or deletes the league (delete confirms natively).

## How to get to it (user POV)

- Open a workspace and click **Config**.
- Visit `/league/<id>/config`.

## Driving it with Playwright

Preconditions:

- Doctor HEALTHY. Fresh context + football onboarding.
- On `/league/<id>/config`.

- **Sections.** Headings (stamp `h2`): `League identity`, `Scoring`,
  `Roster`, `Draft order & keepers`, `Danger zone`.
- **Rename.** The name field is the `input` inside the label whose stamp
  is `League name` (no aria-label). Fill `Verify Pointer League`, blur.
  Masthead `getByRole("heading", { name: "Verify Pointer League" })`
  updates immediately. Click `leagues /` and confirm the fleet card title
  matches — that is the side-effect proof.
- **Your team.** `getByRole("button", { name: "Your team" })` lists
  `Team 1` … `Team 12`. Changing it recomputes Plan pick numbers.
- **Football scoring.** `getByRole("textbox", { name: "Reception points" })`
  (aria-label `${label} points` with label `Reception`). Default Half PPR
  is `0.5`. Set `1`, press Enter, wait ~600ms (debounced persist, same as
  `e2e/persistence-smoke.spec.ts`). Board points for receivers rise.
  Preset: `getByRole("button", { name: "Football scoring preset" })` then
  `Apply Preset`.
- **Baseball scoring.** `locator('input[aria-label="Home Runs (HR) points"]')`
  — the persistence-smoke handle.
- **Delete.** `getByRole("button", { name: /delete league/i })`. Accept
  `page.once("dialog", (d) => d.accept())`. Disabled when only one league
  exists. After delete, fleet is `/` and the card is gone.
- **Proof.** Screenshot after rename (masthead) plus fleet card. Helper:
  `bun .cursor/skills/verify-pointer/helpers/drive.mjs config`.

## Gotchas

- No save button. Proof is the derived surface after blur/Enter, then a
  reload if you claim persistence.
- Football preset dropdown keeps the last preset name after a manual edit;
  it does not show "Custom" (noted in `scenarios/config-editing.md`).
- Delete uses `window.confirm`, not `AppDialog`.
- League name input is uncontrolled (`defaultValue` + `onBlur`). Assert
  the masthead heading, not the input value after remount.
- `/settings` still exists as a route; the Solstice workspace Config tab
  is the user path this map covers.
