# Plan

The Plan tab is the pre-draft strategy worksheet: a snake-draft pick
timeline for your team's slots, a targets shortlist, and a tier-supply
readout. It is the default workspace tab and the surface live draft
returns to after exit.

## Sub-features

- `plan-timeline` lists one row per roster slot (`R1.01`, `p1 overall`) with on-deck / projected / logged chips.
- `plan-targets` flags players from `Search players to flag as targets`.
- `plan-notes` saves a per-round slot note on blur (`Round 1 note`).
- `plan-tiers` shows remaining-vs-printed supply by position (`Tier supply`).

## How to get to it (user POV)

- Click **Open workspace** on a fleet card (lands on Plan).
- Visit `/league/<id>` or `/league/<id>/plan`.
- Click **Plan** in the workspace tab rail.
- Click **Exit live draft** from the draft room.

## Driving it with Playwright

Preconditions:

- Doctor HEALTHY. Fresh context + football onboarding (12 teams, Team 1
  is you, built-in pool attached).
- Workspace Plan tab.

- **Worksheet.** After Open workspace, wait for
  `getByRole("heading", { name: /pick timeline/i })` (accessible name
  `Pick timeline — your slots`). Also visible: heading `Targets` with
  stamp `0 flagged`, heading `Tier supply`, and a first slot `R1.01`
  marked `on deck`. Screenshot `01-plan-worksheet.png`.
- **Targets.** Fill `getByRole("textbox", { name: "Search players to flag as targets" })`
  with `chase`. Click the dropdown button whose name matches
  `/Ja'Marr Chase/i` (Plan uses the full stored name, not the Board
  abbreviation). Stamp becomes `1 flagged`. The flagged row stays in
  the Targets panel after the search clears.
- **Note.** Fill `getByRole("textbox", { name: /Round 1 note/i })` with
  a phrase, blur. Click Board then Plan. The Round 1 note input still
  holds that phrase.
- **Proof.** Action + result screenshots. Helper:
  `bun .cursor/skills/verify-pointer/helpers/drive.mjs plan`.

## Gotchas

- Plan names are **not** abbreviated. Assert `Ja'Marr Chase`, not
  `J. Chase`.
- The search's visible placeholder is `add a target — search the board…`;
  the accessible name is `Search players to flag as targets`.
- Slot notes use `defaultValue` + `onBlur` (uncontrolled). A Base UI
  console warning on blur has been seen historically; prove persistence
  by leaving the tab and coming back, not by re-reading the input
  immediately in the same mount.
- Without a projection source the tab shows `No football source selected`
  and an Intel link — wait for the timeline heading, not the URL.
- Changing **Your team** on Config recomputes every overall pick number
  on this timeline.
