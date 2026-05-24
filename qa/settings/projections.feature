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

  Scenario: Upload a new batter and pitcher CSV projection group
    Given no projection group named "BDD Upload Test" exists in the list
    And I have generated a valid batter CSV file at "/tmp/bdd-batters.csv"
      with columns such as Name, Team, PA, AB, H, 1B, 2B, 3B, HR, R, RBI, BB, SO, SB, CS, AVG, OBP, SLG
      and at least one row of sample data
    And I have generated a valid pitcher CSV file at "/tmp/bdd-pitchers.csv"
      with columns such as Name, Team, W, L, QS, CG, ShO, G, GS, SV, HLD, BS, IP, H, R, ER, HR, BB, SO, ERA, WHIP, K/9, BB/9, FIP
      and at least one row of sample data
    When I click the "Upload Projections" button
    Then a dialog titled "Upload Player Projections" should appear
    When I select both files "/tmp/bdd-batters.csv" and "/tmp/bdd-pitchers.csv" in the file input inside the "Browse Files" label
    Then the dialog should show detected batters with a count greater than 0
    And the dialog should show detected pitchers with a count greater than 0
    And a preview table should display rows from each file
    When I clear the "Group Name" input and type "BDD Upload Test"
    And I click the "Import Group" button
    Then the dialog should close
    And the projection groups list should contain a group named "BDD Upload Test"
    And that group should show a source label of "Upload"
    And that group should show player counts greater than 0 for both batters and pitchers

    # Cleanup: remove the test group so the scenario is idempotent
    When I click the "Delete Group" button for the "BDD Upload Test" group
    And I click the "Confirm Delete" button
    Then the "BDD Upload Test" group should be removed from the list

  Scenario: Upload an invalid CSV shows zero detected players and does not crash
    Given I have generated a CSV file at "/tmp/bdd-invalid.csv"
      with columns that do not match batter or pitcher projection data (e.g., Product, Category, Price)
      and at least one row of sample data
    When I click the "Upload Projections" button
    Then a dialog titled "Upload Player Projections" should appear
    When I select the file "/tmp/bdd-invalid.csv" in the file input inside the "Browse Files" label
    Then the dialog should show "Detected: 0" players
    And the preview table should display no rows
    When I click the "Cancel" button
    Then the dialog should close
