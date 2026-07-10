# scenarios/ — agent-executed behavioral test flows

Human-language, Gherkin-style scenarios that describe how DraftSpa behaves
from a user's point of view. They are **executed by an agent driving a real
browser** against the dev server — not compiled, not run by a test runner.

This layer **complements** the mechanical suites; it never replaces them:

| Layer | What it locks | Runner |
|---|---|---|
| `bun test src/lib` | domain logic (scoring, draft math, …) | bun test |
| `bun run test:ui` (vitest) | component behavior | vitest |
| `PW_PORT=<port> bunx playwright test` (`e2e/`) | URL contracts, visual goldens, persistence smoke | Playwright CI |
| `scenarios/` (this directory) | whole user flows, in user language | an agent + a browser |

Scenarios explore; tests lock. A scenario can notice that "renaming the
league updates the masthead *and* the home card"; a Playwright golden can
only tell you a pixel changed.

## The contract: when running these is REQUIRED

**Before marking any UI-affecting task complete, an agent MUST execute the
scenario files that touch the affected surfaces** (all of them for broad
changes) against the running app, and report the run record (format below).
A UI task whose relevant scenarios have not been executed is not done. This
is part of the definition of done, alongside the mechanical gates.

Two rules about *who* runs them:

1. **Independence.** Where possible, the executing agent should not be the
   agent that implemented the change (spawn a fresh subagent or hand off to
   a separate session). An implementer verifying its own work tends to see
   what it expects to see. If independence is impractical, at minimum
   execute from a fresh browser profile and follow the scenario text
   literally — not your memory of the change.
2. **Literalism.** Follow each Given/When/Then as written. If a step cannot
   be executed as written, that is a finding (see failure taxonomy), not a
   license to improvise.

## The promotion pipeline: scenarios explore, tests lock

Scenario expectations start out descriptive ("the Board re-ranks"). When one
hardens into a single precise expected answer — an exact URL shape, an exact
recomputed number, an exact persisted value — **distill it into a coded
Playwright test in `e2e/` so CI inherits it**, then keep the scenario step
phrased at the human level (or trim it if fully covered). Examples already
locked this way: league URL contracts (`e2e/league-url-contract.spec.ts`),
persistence smoke (`e2e/persistence-smoke.spec.ts`). The reverse also holds:
if a scenario keeps flaking at the human level, it is usually telling you
the UI is ambiguous — fix the UI, don't gold-plate the scenario.

## How to run

1. **Boot the dev server** on a free port (local shells can leak Tidewave
   TLS env vars; unset them):

   ```bash
   env -u TIDEWAVE_HTTPS_KEY -u TIDEWAVE_HTTPS_CERT bun run dev -- --port 3231
   ```

2. **Drive a real browser** — a `@playwright/test` script (`chromium.launch`
   + `page.getByRole(...)`), or the `browse` CLI with `--local`. Start from
   a **fresh browser context/profile** unless the scenario's Background says
   otherwise (DraftSpa state lives in IndexedDB, so a fresh context = a
   first-time visitor).

3. **Walk each scenario section step by step**: perform every When, check
   every Then against what is actually on screen. Identify elements by the
   visible text quoted in the scenario — never by CSS selectors or DOM
   structure.

4. **Record pass/fail + evidence per scenario section** (format below), with
   screenshots at key verification points.

5. New oddities discovered while executing: add them to the scenario file as
   `> NOTE:` callouts (dated), don't silently assert them as expected.

### Run record format

One block per scenario file executed:

```
## Run record — scenarios/<file>.md
- date: YYYY-MM-DD · commit: <sha> · executor: <agent/human> · app: http://localhost:<port>
- result: PASS | FAIL | BLOCKED  (per scenario section)

### PASS|FAIL — <scenario section title>
  - ok|FAILED — <observed evidence: quoted UI text, URL, screenshot path>
  ...
```

Classify failures before reporting (taxonomy borrowed from `qa/README.md`,
which also has the authoring guide these files follow): **Regression** (app
is wrong — file/fix it), **Execution error** (the step or the harness was
wrong — fix the scenario or your driver), **Flake** (add an observable wait
signal), **Environment** (server/browser not ready).

## Scenario files

| File | Flow |
|---|---|
| `league-onboarding.md` | First visit → onboarding hero → one-click league creation → adding more leagues |
| `workspace-tab-navigation.md` | Plan/Board/Intel/Config tabs, URL-per-tab, back button, draft takeover, breadcrumb |
| `config-editing.md` | Every Config-tab section and its downstream effects (gates Config-tab refactors) |
| `plan-strategy.md` | Pick timeline, targets, slot notes, tier supply |
| `local-persistence.md` | Edits, strategy, and draft state survive reloads and return visits |
| `draft-room.md` | Live draft takeover: sync strip, quick log, board logging, undo, exit |

All flows were verified against the running app on 2026-07-10 (commit
5ba5267). Behaviors that looked broken or odd at that time are marked with
`> NOTE:` callouts inside the files rather than asserted as expected — read
those before filing bugs or locking tests.

## Example: dry run of `workspace-tab-navigation.md`

Executed 2026-07-10 as the validation run for this directory. The first
attempt reported two FAILs ("tab rail = PLAN, BOARD, …" vs expected
"Plan, Board, …") — classified as **execution errors** (the driver compared
case-sensitively against CSS-uppercased labels), the harness was fixed, and
the rerun was clean. That is the taxonomy working as intended.

```
## Run record — scenarios/workspace-tab-navigation.md
- date: 2026-07-10 · commit: 5ba5267 · executor: claude subagent (playwright/chromium) · app: http://localhost:3231

### PASS — Opening a workspace lands on the Plan tab
  - ok — URL is http://localhost:3231/league/7a83997c-7407-4d94-b470-0d971359159a/plan
  - ok — breadcrumb "leagues /" present
  - ok — masthead title "My Football League"
  - ok — chips NFL / 12 TEAMS / SRC · 2025 FOOTBALL PRIOR-YEAR STATS
  - ok — "START LIVE DRAFT" button present
  - ok — tab rail = PLAN, BOARD, INTEL, CONFIG
  - ok — active tab is Plan

### PASS — Each tab shows its own surface and updates the URL
  - ok — Board URL …/board · ranked table · "Page 1 of 28"
  - ok — Intel URL …/intel · FOOTBALL LIBRARY + BASEBALL LIBRARY · "684 players" · USED BY · Upload CSV
  - ok — Config URL …/config · sections LEAGUE IDENTITY / SCORING / ROSTER / DRAFT ORDER & KEEPERS / DANGER ZONE
  - ok — Plan URL …/plan · PICK TIMELINE — YOUR SLOTS · TARGETS · TIER SUPPLY
  - ok — masthead persisted across tabs

### PASS — Browser back button retraces tab history
  - ok — back #1 -> …/config
  - ok — back #2 -> …/intel
  - ok — active tab after back = INTEL

### PASS — The live draft is a takeover, not a tab
  - ok — draft URL …/draft
  - ok — sync strip: PICK 1 / ON THE CLOCK
  - ok — workspace tab rail absent in takeover
  - ok — exit returns to …/plan

### PASS — The breadcrumb returns to the fleet
  - ok — URL http://localhost:3231/
  - ok — Leagues page with league cards

RESULT: 5/5 scenarios passed
(screenshots: dryrun-01-plan.png, dryrun-02-board.png, dryrun-03-draft.png)
```
