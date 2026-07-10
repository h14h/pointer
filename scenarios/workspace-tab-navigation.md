# Scenario: Workspace tab navigation

A league workspace is one shell page with four tabs — Plan, Board, Intel,
Config — plus a full-screen live-draft takeover. Navigation is instant
(client-side pushState), the URL always names the league and tab, and the
browser back button works.

Verified against the running app on 2026-07-10.

## Background

- Given a football league exists (fresh profile → click "FOOTBALL" on the
  onboarding hero)
- And I open its workspace via the "OPEN WORKSPACE" action on the league card

## Scenario: Opening a workspace lands on the Plan tab

- When the workspace loads
- Then the URL ends in `/league/<league-id>/plan`
- And I see the league masthead: a "leagues /" breadcrumb link, the league
  name as the page title, and vitals chips ("NFL", "12 TEAMS",
  "SRC · 2025 FOOTBALL PRIOR-YEAR STATS")
- And a "START LIVE DRAFT" button with the stamp "track every pick against
  this league's board."
- And a tab rail with exactly four tabs: "PLAN", "BOARD", "INTEL", "CONFIG"
- And "PLAN" is visually marked as the active tab

## Scenario: Each tab shows its own surface and updates the URL

- When I click "BOARD"
- Then the URL ends in `/board` and I see the ranked player table with
  columns like "PLAYER", "POS", "PTS", "PAR", a position filter, and
  pagination ("Page 1 of 28" for the built-in football dataset)
- When I click "INTEL"
- Then the URL ends in `/intel` and I see the projection libraries — a
  "FOOTBALL LIBRARY" and a "BASEBALL LIBRARY" ("one library per sport") —
  each listing its built-in dataset (e.g. "2025 Football Prior-Year Stats,
  BUILT-IN, 684 players"), which leagues use it ("USED BY"), and a CSV
  upload affordance
- When I click "CONFIG"
- Then the URL ends in `/config` and I see the league configuration sections:
  "LEAGUE IDENTITY", "SCORING", "ROSTER", "DRAFT ORDER & KEEPERS",
  "DANGER ZONE"
- When I click "PLAN"
- Then the URL ends in `/plan` and I see "PICK TIMELINE — YOUR SLOTS",
  a "TARGETS" panel, and a "TIER SUPPLY" panel
- And in every case the masthead, chips, and tab rail stay in place —
  only the content below changes, with no full page reload

## Scenario: Browser back button retraces tab history

- Given I have visited Plan → Board → Config in that order
- When I press the browser back button
- Then I am on the Board tab (URL ends in `/board`)
- When I press back again
- Then I am on the Plan tab

## Scenario: The live draft is a takeover, not a tab

- Given I am anywhere in the workspace
- When I click "START LIVE DRAFT"
- Then the URL ends in `/draft` and the entire workspace chrome is replaced
  by the full-screen draft room (dark "night mode": sync strip across the
  top, pick tape, quick-log bar, board) — no tab rail, no masthead
- When I click "EXIT LIVE DRAFT" in the draft room's top strip
- Then I return to the workspace on the Plan tab

## Scenario: The breadcrumb returns to the fleet

- Given I am on any workspace tab
- When I click the "leagues /" breadcrumb above the league name
- Then I am back on the "Leagues" home page with the league cards
