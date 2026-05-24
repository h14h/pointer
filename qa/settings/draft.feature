Feature: Draft Settings

  The Draft section manages league size, team names, draft order, and keeper
  assignments. Draft setup locks once draft activity begins.

  Background:
    Given the dev server is running
    And I am on the settings page with section "draft"
    And at least one projection group with players is loaded

  Scenario: Draft section loads with team list
    When the page finishes loading
    Then the "Draft" heading should be visible
    And the "League Size" input should be visible
    And the team list should display each team's name and keeper badges

  Scenario: Change league size
    Given no draft activity has occurred (setup is unlocked)
    When I change the "League Size" input to 10
    Then the team list should update to show 10 teams
    And new teams should have default names like "Team 9" and "Team 10"

  Scenario: Add a team below existing team
    Given setup is unlocked and fewer than 20 teams exist
    When I expand a team row and click "Add team below"
    Then a new team should be inserted below the selected team

  Scenario: Remove a team
    Given setup is unlocked and more than 2 teams exist
    When I expand a team row and click "Remove team"
    Then that team should be removed from the list
    And the total team count should decrease by 1

  Scenario: Reorder teams
    Given setup is unlocked
    When I expand a team row and select a new position from the reorder dropdown
    Then the team should move to the selected position in the draft order

  Scenario: Draft setup locks after activity
    Given at least one non-keeper pick has been made in the current league
    When I view the Draft settings
    Then a warning panel should state that reorder controls are locked
    And the "League Size" input should be disabled
    And reorder controls should be disabled
    But team names and keeper edits should still be available

  Scenario: Reset draft picks
    Given an in-progress draft exists with non-keeper picks
    When I view the Draft settings
    Then a "Reset Draft" button should be visible in the warning panel
    When I click "Reset Draft"
    Then a confirmation dialog should appear with text "Reset all draft picks?"
    When I confirm the reset
    Then all in-progress drafted picks should be cleared
    And keeper assignments should remain in place

  Scenario: Assign a keeper to a team
    Given a team row is expanded
    When I type a player name in the keeper search input
    Then matching player candidates should appear below the search
    When I click a candidate player
    Then that player should be assigned as a keeper for the team
    And a round cost should be automatically assigned

  Scenario: Remove a keeper
    Given a team has assigned keepers
    When I expand the team row
    And I click the remove button next to a keeper
    Then that keeper assignment should be removed

  Scenario: Change keeper round cost
    Given a team has assigned keepers
    When I change the round input for a keeper
    Then the keeper's draft slot cost should update to the new round
    And the pick cost label should update accordingly

  Scenario: Move keeper round earlier or later
    Given a team has assigned keepers
    When I click the up arrow to move a keeper to an earlier round
    Then the keeper should move to the next available earlier round
    When I click the down arrow to move a keeper to a later round
    Then the keeper should move to the next available later round
