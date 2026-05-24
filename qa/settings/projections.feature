Feature: Projections Settings

  The Projections section lets users manage projection datasets, upload CSV files,
  rename or delete uploaded groups, and import position eligibility data.

  Background:
    Given the dev server is running
    And I am on the settings page with section "projections"

  Scenario: Projections section loads with group list
    When the page finishes loading
    Then the "Projections" heading should be visible
    And the "Upload Projections" button should be visible
    And each projection group should display its name, source label, and player counts

  Scenario: Activate a projection group
    Given multiple projection groups are listed
    When I click the "Use" button on a non-active projection group
    Then that group should become the active group
    And its button should change to "Active"

  Scenario: Rename a projection group
    Given an uploaded (non-built-in) projection group is listed
    When I type a new name into the "Rename Projection Group" input
    And I click the "Save Name" button
    Then the projection group should display the new name

  Scenario: Delete a projection group
    Given an uploaded (non-built-in) projection group is listed
    When I click the "Delete Group" button
    Then a "Confirm Delete" button should appear
    When I click "Confirm Delete"
    Then the projection group should be removed from the list

  Scenario: Built-in datasets are protected from deletion
    Given a built-in (public dataset) projection group is listed
    Then the "Delete Projection Group" panel should not be present for that group
    And a message should indicate "Built-in datasets stay protected"

  Scenario: Import position eligibility
    Given a projection group is listed
    And the "Eligibility Season" input is visible
    When I set the season to a valid year (e.g., 2025)
    And I click the "Import Eligibility" button
    Then the eligibility import should begin
    And progress information should be displayed
