Feature: Leaderboard (Main Page)

  The main page displays a ranked player leaderboard with search, filtering,
  column visibility controls, sorting, pagination, and inline draft tracking.

  Background:
    Given the dev server is running
    And I am on the leaderboard page
    And at least one projection group with players is loaded

  Scenario: Page loads with correct title and header elements
    When the page finishes loading
    Then the page title should be "Pointer - Fantasy Baseball Draft Aid"
    And the header should display "Pointer" and "Leaderboard"
    And the projection group dropdown should be visible
    And the league dropdown should be visible
    And the Draft mode toggle should be visible
    And the Settings link should be visible

  Scenario: Search players by name
    Given the player search box is visible with placeholder "Search players..."
    When I type "Trout" in the search box
    Then the leaderboard should filter to show only players matching "Trout"
    And "Mike Trout" should appear in the results

  Scenario: Search is case-insensitive
    When I type "trout" in lowercase in the search box
    Then "Mike Trout" should still appear in the results

  Scenario: Clear search restores full list
    Given I have typed "Trout" in the search box
    When I clear the search box
    Then the full player list should be restored

  Scenario: Filter by player type (All, Batters, Pitchers)
    Given the player type dropdown shows "All Players"
    When I select "Batters" from the player type dropdown
    Then only batters should appear in the leaderboard
    When I select "Pitchers" from the player type dropdown
    Then only pitchers should appear in the leaderboard

  Scenario: Filter by position (multi-select)
    Given the position filter dropdown shows "Position"
    When I open the position filter dropdown
    And I select "SS" from the position options
    Then only shortstops should appear in the leaderboard

  Scenario: Combine search and position filter
    Given the position filter is set to "OF"
    When I type "Judge" in the search box
    Then "Aaron Judge" should appear in the results

  Scenario: Column visibility toggle for batting stats
    Given the "Columns" dropdown is visible
    When I open the Columns dropdown
    And I select a batting stat (e.g., "HR") from the Batting section
    Then the "HR" column should appear in the leaderboard table

  Scenario: Column visibility toggle for pitching stats
    Given the "Columns" dropdown is visible
    When I open the Columns dropdown
    And I select a pitching stat (e.g., "SV") from the Pitching section
    Then the "SV" column should appear in the leaderboard table

  Scenario: Sort columns by clicking headers
    Given the leaderboard table is visible with data
    When I click the "Projected Points" column header
    Then the rows should sort by projected points in ascending order
    When I click the "Projected Points" column header again
    Then the rows should sort by projected points in descending order

  Scenario: Pagination controls
    Given the leaderboard has more than 25 players
    Then pagination controls should be visible
    And the page size should be 25 by default
    When I navigate to the next page
    Then the next set of 25 players should be displayed

  Scenario: No players loaded state
    Given no projection groups with players are loaded
    When the page finishes loading
    Then the leaderboard should display "No players loaded"
    And it should display "Upload a CSV file to get started"

  Scenario: Draft mode toggle enables draft UI
    Given the Draft mode toggle is off
    When I click the Draft mode toggle to turn it on
    Then the draft filter dropdown should appear with options: Available, All, Drafted, Keepers
    And the "On The Clock" banner should appear showing the current team and pick
    And a hint text should appear: "Tap an available player to make the current pick"

  Scenario: Draft a player from the leaderboard
    Given Draft mode is enabled
    And it is a team's turn to pick
    And the player list shows available players
    When I click on an available player row
    Then the player should be marked as drafted
    And the "On The Clock" banner should advance to the next pick
    And a toast notification should show the drafted player's name

  Scenario: Undo last pick
    Given Draft mode is enabled
    And at least one pick has been made
    When I click the "Undo Last Pick" button in the "On The Clock" banner
    Then the last pick should be undone
    And the player should return to available status
    And a toast notification should show "Pick undone"

  Scenario: Drafted and kept players show team badges
    Given Draft mode is enabled
    And some players have been drafted or assigned as keepers
    When I view the leaderboard with draft filter set to "All"
    Then drafted players should display their team name badge
    And kept players should display a "K" keeper badge
