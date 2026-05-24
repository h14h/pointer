Feature: Scoring Settings

  The Scoring section lets users adjust point weights for batting and pitching
  categories, apply presets, and toggle two-way player ranking merge behavior.

  Background:
    Given the dev server is running
    And I am on the settings page with section "scoring"
    And at least one projection group is loaded

  Scenario: Scoring section loads with preset and weights
    When the page finishes loading
    Then the "Scoring" heading should be visible
    And the "Preset" dropdown should be visible
    And the "Apply Preset" button should be visible
    And batting point weight inputs should be organized by group
    And pitching point weight inputs should be organized by group

  Scenario: Apply a scoring preset
    Given the preset dropdown shows the current preset
    When I select a different preset from the dropdown (e.g., "FanGraphs Points")
    And I click the "Apply Preset" button
    Then all batting point weights should update to the selected preset's values
    And all pitching point weights should update to the selected preset's values
    And the preset dropdown should reflect the newly applied preset

  Scenario: Change a batting point weight
    Given the batting section is visible
    When I change the "HR" point weight to 6
    Then the "HR" input should display 6
    And player projected points on the leaderboard should recalculate accordingly

  Scenario: Change a pitching point weight
    Given the pitching section is visible
    When I change the "K" point weight to 2
    Then the "K" input should display 2
    And pitcher projected points on the leaderboard should recalculate accordingly

  Scenario: Merge two-way toggle is disabled without player IDs
    Given the active projection group uses generated IDs (no external player ID source)
    Then the "Merge two-way" toggle should be disabled
    And a help tooltip should explain: "Merge two-way requires provided player IDs in both uploads"

  Scenario: Merge two-way toggle is enabled with player IDs
    Given the active projection group has external player IDs for both batters and pitchers
    Then the "Merge two-way" toggle should be enabled
    When I click the toggle to enable merging
    Then two-way players should appear as a single combined entry in the leaderboard
