Feature: Roster Settings

  The Roster section lets users configure per-team starting slots for all
  baseball positions, bench capacity, and an optional weekly pitcher start limit.

  Background:
    Given the dev server is running
    And I am on the settings page with section "roster"

  Scenario: Roster section loads with position slots
    When the page finishes loading
    Then the "Roster" heading should be visible
    And the total slots badge should display the sum of all positions plus bench
    And position slot inputs should be organized by group: Outfield, Infield, Flex, Pitchers, Catchers, Reserves

  Scenario: Change a position slot count
    Given the "Outfield" section is visible
    When I change the "LF" slot value to 3
    Then the "LF" slot should display 3
    And the total slots badge should update to reflect the new count

  Scenario: Change bench slots
    Given the "Reserves" section is visible
    When I change the "Bench" slot value to 5
    Then the "Bench" slot should display 5
    And the total slots badge should update accordingly

  Scenario: Toggle weekly start limit
    Given the "Weekly start limit" toggle is visible in the Pitcher Usage panel
    And the toggle is initially off
    When I click the toggle to enable it
    Then the toggle should turn on
    And the "Starts per week" input should become enabled
    And it should default to 12 starts

  Scenario: Change weekly start limit value
    Given the weekly start limit toggle is enabled
    When I change the "Starts per week" input to 10
    Then the input should display 10

  Scenario: Disable weekly start limit
    Given the weekly start limit toggle is enabled
    When I click the toggle to disable it
    Then the toggle should turn off
    And the "Starts per week" input should become disabled
