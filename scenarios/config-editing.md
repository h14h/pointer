# Scenario: Config tab — editing league settings

Everything that defines a league lives on the Config tab: identity, scoring,
roster shape, draft order & keepers, and the danger zone. Every edit saves
immediately (no save button anywhere) and re-derives the rest of the
workspace — the Board re-scores, the Plan timeline re-shapes, the masthead
chips update.

This file gates changes to the Config tab (e.g. splitting it into smaller
tabs): after such a change, every behavior below must still hold somewhere
in the UI.

Verified against the running app on 2026-07-10 (football league; a baseball
league's Config tab has the same five sections, but its Scoring section shows
batting/pitching categories with presets like "ESPN Standard" and its Roster
section shows infield/outfield/pitcher slots and a "Weekly start limit").

## Background

- Given a fresh football league ("My Football League", 12 teams, built-in
  projections)
- And I am on its workspace's "CONFIG" tab

## Scenario: The Config tab shows five sections

- Then I see, in order, the section stamps "LEAGUE IDENTITY", "SCORING",
  "ROSTER", "DRAFT ORDER & KEEPERS", and "DANGER ZONE"

## Scenario: Renaming the league (League identity)

- Given the "LEAGUE IDENTITY" panel with a "League name" field and a
  "Your team" dropdown, plus the hint that "Your team" drives the Plan tab's
  pick timeline and the draft room's on-the-clock highlights
- When I clear the "League name" field, type "Dynasty Degens", and click away
- Then the masthead title above the tabs immediately reads "Dynasty Degens"
- And the league card on the "Leagues" home page shows the new name too

## Scenario: Choosing my team (League identity)

- When I open the "Your team" dropdown
- Then it lists every team in the league's draft order by name
  ("Team 1" … "Team 12" until teams are renamed)
- When I pick a different team
- Then the Plan tab's pick timeline recomputes to that team's snake-draft
  slots, and the draft room highlights that team as "YOU"

## Scenario: Editing a scoring weight re-scores the whole board

- Given the "SCORING" section shows per-stat point inputs grouped under
  "OFFENSE" (passing, rushing, receiving, misc) and "KICKING & DEFENSE"
  with the hint "Yardage rows are per yard: 0.04 = 1 point per 25 yards,
  0.1 = 1 point per 10."
- And on the Board tab the top player is "C. McCaffrey" with 366 points
  (default Half PPR weights)
- When I change "Reception" from 0.5 to 1 and click away
- Then no save step is needed
- And the Board tab immediately shows recomputed points and a new ranking —
  McCaffrey's points rise (366 → 417) and receiving-heavy players climb
  (e.g. "P. Nacua" jumps into the top 3)

## Scenario: Applying a scoring preset

- Given the "SCORING" section's "PRESET" dropdown (reads "Half PPR" for a new
  football league) and an "APPLY PRESET" button
- When I open the dropdown
- Then it offers "Standard (Non-PPR)", "Half PPR", and "Full PPR"
- When I select "Full PPR" and click "APPLY PRESET"
- Then all scoring inputs snap to that preset's values ("Reception" becomes 1)

> NOTE: The preset dropdown is a picker, not a status readout — after manually
> editing a weight so the values no longer match any preset, the dropdown
> still shows the last preset name (e.g. "Half PPR"). It never displays
> "Custom". Observed 2026-07-10; possibly intentional, but easy to misread.

## Scenario: Changing the roster shape re-shapes the pick timeline

- Given the "ROSTER" section shows steppers for starters ("QB", "RB", "WR",
  "TE"), flex ("FLEX (RB/WR/TE)", "Superflex (QB/RB/WR/TE)"), special teams
  ("K", "D/ST"), and reserves ("Bench"), and a stamp reading
  "14 SLOTS PER TEAM"
- When I change "QB" from 1 to 2
- Then the stamp immediately reads "15 SLOTS PER TEAM"
- And the Plan tab's pick timeline gains a 15th slot (a new "R15.x" row) —
  the timeline always has one slot per roster spot
- And the draft room's total pick count follows (15 rounds × league size)

## Scenario: Changing the league size (Draft order & keepers)

- Given the "DRAFT ORDER & KEEPERS" section shows a "League Size" stepper
  ("12 TEAMS") with the caption "Structural team changes lock once draft
  activity begins.", and a "DRAFT ORDER (12)" ledger of team rows
- When I change the league size from 12 to 10
- Then the draft order ledger drops to 10 team rows
- And the masthead chip immediately reads "10 TEAMS"
- And the Plan tab's snake-draft pick numbers recompute

## Scenario: Reordering and renaming teams

- Given each team row has a position number, an editable team name, a
  "MOVE TO" position dropdown, an "EDIT KEEPERS" toggle, and add/remove
  controls ("+" and "×")
- When I rename "Team 2" to "Rickety Cricket" and click away
- Then the row keeps the new name, and "Rickety Cricket" appears in the
  "Your team" dropdown under League identity
- When I use "MOVE TO" to move a team to a different position
- Then the ledger reorders and my own pick slots recompute if my team moved

## Scenario: Assigning keepers

- When I click "EDIT KEEPERS" on a team row
- Then the row expands into a "KEEPERS" panel ("One row per keeper for quick
  edits.") with a "Search available players for Team N" field and the hint
  "New keepers are added to the next open slot for this team. Use Rd or the
  arrows to move them to any open round."
- When I search "gibbs" and click "Jahmyr Gibbs — DET" in the results
- Then a keeper row appears showing the player, an "RD" stepper (round 1),
  the resulting pick ("PICK 1"), and a "REMOVE" action
- And the collapsed team row shows a keeper badge ("J. Gibbs • R1")
  instead of "No Keepers"
- And the button now reads "HIDE KEEPERS"

## Scenario: Structural settings lock once draft activity exists

- Given I have logged at least one pick in the live draft room and returned
  to the Config tab
- Then a warning panel appears: "Team order, add/remove, and league size are
  locked because draft activity already exists. Reorder controls are
  disabled, but team names and keeper assignments can still be edited." with
  the stamp "to start over, reset the draft from the draft room"
- And the "League Size" stepper and the add-team ("+") / remove-team ("×")
  controls are disabled
- And team name fields and keeper editing still work

## Scenario: Danger zone — duplicate

- Given the "DANGER ZONE" panel with "DUPLICATE LEAGUE" and "DELETE LEAGUE"
- When I click "DUPLICATE LEAGUE"
- Then the "Leagues" home page gains one more card named
  "Copy of <league name>" with the same team count and projection source

## Scenario: Danger zone — delete requires confirmation

- Given more than one league exists ("DELETE LEAGUE" is disabled when this
  is the only league)
- When I click "DELETE LEAGUE"
- Then a browser confirmation asks: 'Delete "<league name>"? This cannot be
  undone.'
- When I confirm
- Then I am returned to the "Leagues" home page and the card is gone, with
  the brand-bar league counter decremented
