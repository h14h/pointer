# Plan

The Plan tab is the league's strategy worksheet: pick timeline, targets, and
tier supply. It is the default workspace landing (`/league/<id>/plan`) and
the screen live draft returns to.

## Sub-features

- `plan-timeline` shows round slots for your team with status chips
  (`projected` / `on deck` / `logged` / `keeper`).
- `plan-targets` searches the pool (`Search players to flag as targets`) and
  flags names onto the Targets rail.
- `plan-notes` saves a per-round note (`Round 1 note`, …) on blur.

## How to get to it (user POV)

- Click **Open workspace** on a fleet card (lands on Plan).
- Click **Plan** in the workspace tab rail.
- Visit `/league/<id>/plan` (bare `/league/<id>` also renders Plan).
- **Exit live draft** returns here.

## Driving it with Playwright

Preconditions:

- Doctor HEALTHY. Fresh context + football onboarding.
- Built-in football source attached (otherwise Plan shows
  `No football source selected` and an Intel link).

- **Open.** From the fleet, click `getByRole("link", { name: /open workspace/i })`.
  URL ends in `/plan`. `nav a[aria-current="page"]` text is `Plan`.
  Heading `My Football League`.
- **Targets.** `getByRole("textbox", { name: "Search players to flag as targets" })`
  is visible (placeholder `add a target — search the board…`). Panel title
  `Targets`.
- **Notes.** `getByRole("textbox", { name: /Round 1 note/i })` is visible.
- **Empty-source (only if you detach the source on Intel).** Plan replaces
  the worksheet with `No football source selected` and a link `Intel`.
- **Proof.** Screenshot of timeline + targets rail. Helper:
  `bun .cursor/skills/verify-pointer/helpers/drive.mjs plan`.

## Gotchas

- Target search is an **aria-label**, not the Board placeholder
  `Search players...`. Different surface.
- Slot notes are uncontrolled; assert the value after blur + a reload if
  you claim persistence (`scenarios/plan-strategy.md`).
- After a logged pick, the matching slot chip reads `logged` with the
  player name — that proof belongs to [live-draft.md](./live-draft.md)
  `draft-exit`.
- CSS shows `PLAN`; accessible name is `Plan`.
