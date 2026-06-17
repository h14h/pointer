# QA BDD Scenarios

This directory contains behavior-driven development (BDD) scenarios for DraftSpa.
These are **manual QA instructions** designed to be executed by a QA agent
(or a human) that interacts with the running app and verifies functionality.

## Format

Each `.feature` file follows Gherkin syntax:

```gherkin
Feature: <Feature Name>

  Background:
    Given <shared preconditions>

  Scenario: <Specific behavior>
    Given <context>
    When <action>
    Then <expected outcome>
```

## Execution

Scenarios are fed to a QA agent with browser automation capabilities.
The agent:
1. Starts the dev server (`bun run dev`)
2. Opens the app URL
3. Follows each step literally
4. Screenshots at key verification points
5. Reports PASS/FAIL per scenario with evidence

## Coverage Areas

- `leaderboard/` — Main page: player search, filtering, sorting, column visibility, pagination, draft mode
- `settings/projections.feature` — Projection group management (activate, rename, delete, upload CSV, eligibility import)
- `settings/leagues.feature` — League CRUD (create, activate, rename, duplicate, delete)
- `settings/draft.feature` — Draft setup (league size, team order, keepers, reset)
- `settings/roster.feature` — Roster slot configuration (positions, bench, weekly start limit)
- `settings/scoring.feature` — Scoring weights (presets, batting/pitching points, two-way merge)

---

## Authoring Guide: Writing Agent-Executable BDD Cases

BDD scenarios in this repo are intended to be run by autonomous agents (e.g. Pi/Codex with GPT-5.5 xhigh). An agent has no prior knowledge of the codebase, no memory of past runs, and only the tools you would expect: code execution, file I/O, browser automation, and vision. Write scenarios so that such an agent can execute them correctly on the first attempt.

### 1. Preconditions — Tell the Agent What to Create, Not How

If a scenario needs files or data, describe the requirements in terms the agent can fulfill using its own reasoning and codebase context. Do not inline exact file content — that creates a split-brain problem where schema changes require updating both the code and the BDD test.

✅ **Good:**
```gherkin
Given I have generated a valid batter CSV file at "/tmp/batters.csv"
  with columns such as Name, Team, PA, AB, H, HR, R, RBI, BB, SO
  and at least one row of sample data
And I have generated a valid pitcher CSV file at "/tmp/pitchers.csv"
  with columns such as Name, Team, W, L, IP, SO, ERA, WHIP
  and at least one row of sample data
```

❌ **Bad:**
```gherkin
Given I have generated the following CSV files:
  """
  /tmp/batters.csv
  Name,Team,PA,AB,H,HR,R,RBI,BB,SO
  John Doe,NYY,600,550,160,25,90,85,60,120
  """
```

The burden of producing valid data belongs to the agent. If agents repeatedly fail to generate correct fixtures, invest in developer tooling (e.g., a script that validates CSVs against the same parser the app uses) rather than duplicating schemas in BDD files.

### 2. Observable UI References — Use Exact Visible Text

Agents identify UI elements by visible text, labels, and roles. Use the exact text a user would see. Avoid CSS selectors, data-testid attributes, or internal IDs.

✅ **Good:**
```gherkin
When I click the "Upload Projections" button
Then a dialog titled "Upload Player Projections" should appear
```

❌ **Bad:**
```gherkin
When I click the primary action in the projections header
Then the upload modal opens
```

### 3. Relative Assertions — Verify Changes, Not Absolute State

Apps may have seeded data (built-in datasets, default leagues). Assertions should verify **relative changes** rather than absolute counts, so they don't break when seed data changes.

✅ **Good:**
```gherkin
Then the league list should contain one more league than before
And the new league should be named "Smoke Test League"
```

❌ **Bad:**
```gherkin
Then the league list should contain exactly 3 leagues
```

### 4. Idempotent Cleanup — Every Mutation Must Be Reverted

Scenarios should leave the app in the same state they found it. Include cleanup steps at the end of any scenario that creates, renames, or deletes data. Use the same UI flow a real user would.

✅ **Good:**
```gherkin
  # Cleanup
  When I click the "Delete Group" button for the "BDD Upload Test" group
  And I click the "Confirm Delete" button
  Then the "BDD Upload Test" group should be removed from the list
```

### 5. Distinguish App Response from Agent Action

Phrasing matters. A "When" step describes what the agent does. A "Then" step describes what the **app displays** in response. This makes it clear whether a failure is a regression (app behaved wrong) or an execution error (agent couldn't perform the action).

✅ **Good:**
```gherkin
When I type "Trout" in the search box
Then the leaderboard should filter to show only players matching "Trout"
```

❌ **Bad:**
```gherkin
When I search for Trout
Then the search works
```

### 6. Minimal Coupling — No Internal Knowledge

Scenarios must not reference internal APIs, data shapes, store methods, or implementation details. The agent has no access to the app's internals. Everything must be verifiable through the UI.

✅ **Good:**
```gherkin
Then the "HR" input should display 6
```

❌ **Bad:**
```gherkin
Then the store.scoringSettings.batting.HR should equal 6
```

### 7. File Uploads — Be Explicit About Mechanism

File inputs in modern UIs are often hidden inside styled labels. Tell the agent **which file to upload** and **which visible label wraps the input**. The agent will figure out the mechanism (e.g. setting files on the hidden input).

✅ **Good:**
```gherkin
When I select the file "/tmp/bdd-batters.csv" in the file input inside the "Browse Files" label
```

### 8. Seeding Test Data for Mutation Scenarios

When a scenario requires an uploaded projection group (or other user-created entity) to already exist, the agent should not attempt a UI file upload if the upload mechanism is not reliably automatable with its current toolset. Instead, the agent may seed the data programmatically via a dev-only hook and then verify the UI mutation.

In this app, the Zustand store is exposed on the legacy dev hook `window.__pointerStore` in development builds. The agent can navigate to the app, wait for hydration, and then evaluate JavaScript in the browser console to seed a projection group:

```js
window.__pointerStore.getState().seedProjectionGroup({
  id: "bdd-test-group",
  name: "BDD Rename Target",
  createdAt: new Date().toISOString(),
  source: { kind: "upload" },
  batters: [],
  pitchers: [],
  twoWayPlayers: [],
  batterIdSource: null,
  pitcherIdSource: null,
});
```

After seeding, the agent reloads the page or navigates to the relevant settings tab and proceeds with the UI steps (rename, delete, etc.). This keeps `.feature` files free of implementation details while allowing reliable agent execution.

### 9. Timeouts and Wait States

Agents should wait for async operations (network, parsing, imports). Scenarios should describe **observable signals** that indicate completion, not arbitrary timers.

✅ **Good:**
```gherkin
Then the dialog should show "Detected: 2 batters"
And the preview table should display the first 5 rows
```

❌ **Bad:**
```gherkin
Then wait 3 seconds
```

### Failure Taxonomy

When an agent reports a scenario failure, classify it:

| Category | Cause | Action |
|----------|-------|--------|
| **Regression** | App behavior changed legitimately | Fix the code |
| **Execution Error** | Agent couldn't perform a step | Fix the BDD scenario wording |
| **Flake** | Race condition or non-deterministic UI | Add an observable wait condition |
| **Environment** | Browser/server not ready | Fix the test harness |

If a scenario repeatedly fails with execution errors across different agents, the scenario itself is the bug — not the app.
