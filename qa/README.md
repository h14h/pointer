# QA BDD Scenarios

This directory contains behavior-driven development (BDD) scenarios for Pointer.
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
1. Starts the dev server (`npm run dev`)
2. Opens the app URL
3. Follows each step literally
4. Screenshots at key verification points
5. Reports PASS/FAIL per scenario with evidence

## Coverage Areas

- `leaderboard/` — Main page: player search, filtering, sorting, column visibility, pagination, draft mode
- `settings/projections.feature` — Projection group management (activate, rename, delete, eligibility import)
- `settings/leagues.feature` — League CRUD (create, activate, rename, duplicate, delete)
- `settings/draft.feature` — Draft setup (league size, team order, keepers, reset)
- `settings/roster.feature` — Roster slot configuration (positions, bench, weekly start limit)
- `settings/scoring.feature` — Scoring weights (presets, batting/pitching points, two-way merge)
