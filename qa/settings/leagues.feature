Feature: Leagues Settings

  The Leagues section lets users create, activate, rename, duplicate, and delete
  league profiles. Each league maintains its own scoring, roster, and draft state.

  Background:
    Given the dev server is running
    And I am on the settings page with section "leagues"

  Scenario: Leagues section loads with league list
    When the page finishes loading
    Then the "Leagues" heading should be visible
    And the "Create New League" button should be visible
    And the league list should display each league's name, team count, and last updated date

  Scenario: Create a new league
    Given the league list is visible
    When I click the "Create New League" button
    Then a new league should appear in the list with a default name

  Scenario: Activate a league
    Given multiple leagues exist in the list
    When I click the selection indicator next to an inactive league
    Then that league should become the active league
    And it should display an active checkmark badge

  Scenario: Rename a league
    Given a league is listed
    When I click on the league name
    Then the name should become an editable text input
    When I type a new name and press Enter
    Then the league should display the new name

  Scenario: Duplicate a league
    Given a league is listed
    When I click the "Duplicate" button for that league
    Then a copy of the league should appear in the list

  Scenario: Delete a league
    Given more than one league exists
    When I click the "Delete" button for a league
    Then a delete confirmation panel should appear with a warning
    When I click "Delete" in the confirmation panel
    Then the league should be removed from the list

  Scenario: Cannot delete the last league
    Given only one league remains in the list
    Then the "Delete" button for that league should be disabled
