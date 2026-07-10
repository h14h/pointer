# Scenario: League onboarding — first visit to first league

A brand-new visitor lands on DraftSpa with no data and gets a working,
fully-seeded league in one click. No sign-up, no CSV upload, no empty states.

Verified against the running app on 2026-07-10.

## Background

- Given I open the app in a browser profile with no existing DraftSpa data
  (fresh profile / cleared site data)

## Scenario: First visit shows the onboarding hero

- When the home page finishes loading
- Then I see the DraftSpa brand bar ("DraftSpa — league-specific draft boards")
- And a centered hero reading "Create your first league. DraftSpa builds the
  board around your scoring, roster, projections, and draft order."
- And exactly two choices: a "FOOTBALL" button and a "BASEBALL" button
- And no league cards or "Leagues" heading anywhere

## Scenario: Picking a sport creates the first league instantly

- Given the onboarding hero is showing
- When I click "FOOTBALL"
- Then the hero is replaced by the "Leagues" home page without any further form
- And the brand bar shows "1 LEAGUE · 1 SPORT"
- And I see one league card with a "FOOTBALL" badge, named "My Football League"
- And the card subtitle reads "12 teams · 2025 Football Prior-Year Stats" —
  a built-in projection dataset is already attached, no upload required
- And the card shows a readiness bar reading "2 OF 4 PREPPED"
- And the card offers two actions: "OPEN WORKSPACE" and "LIVE DRAFT"
- And a dashed "+ add a league" card sits next to it

(Clicking "BASEBALL" instead behaves the same way but creates a baseball
league backed by the built-in "2025 Leaders" dataset.)

## Scenario: Adding another league from the fleet page

- Given at least one league already exists and I am on the "Leagues" home page
- When I click the dashed "add a league" card
- Then the card expands into a small form titled "Add a league" with the hint
  "Name it now or later. Each league keeps its own settings, projections,
  targets, and draft board."
- And it has a "LEAGUE NAME" text field, a "SPORT" choice ("FOOTBALL" /
  "BASEBALL"), a "CREATE LEAGUE" button, and a "CLOSE" button
- When I type "Sandlot Classic", choose "BASEBALL", and click "CREATE LEAGUE"
- Then a new card named "Sandlot Classic" with a "BASEBALL" badge appears,
  subtitled "12 teams · 2025 Leaders"
- And the brand bar counter increases to "2 LEAGUES · 2 SPORTS"
