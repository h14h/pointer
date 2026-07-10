# Scenario: Local persistence — everything survives a refresh

DraftSpa is local-first: leagues, settings, strategy, and draft state live in
the browser (IndexedDB via Dexie) with no account or server required. Any
edit made anywhere must survive a page reload and a return visit, and deep
links to a league tab must rehydrate to the same state.

Verified against the running app on 2026-07-10.

## Background

- Given a fresh football league created via onboarding

## Scenario: Config edits survive a reload

- Given I changed "Reception" scoring from 0.5 to 1 and "QB" roster slots
  from 1 to 2 on the Config tab
- When I reload the page (browser refresh on the `/league/<id>/config` URL)
- Then the page rehydrates to the same league and tab — the URL is unchanged
- And "Reception" still shows 1 and "QB" still shows 2
- And derived surfaces stay consistent (Board scores, "15 SLOTS PER TEAM")

## Scenario: The league fleet survives a return visit

- Given at least one league exists with a custom name
- When I navigate away and come back to the home URL (or open a new tab in
  the same browser profile)
- Then the "Leagues" page lists the same league cards with the same names,
  team counts, projection sources, and readiness bars — the onboarding hero
  does not reappear

## Scenario: Strategy survives a reload

- Given I flagged a target and wrote a Round 1 slot note on the Plan tab
- When I reload the page
- Then the target is still flagged ("1 FLAGGED", same take-by guidance)
- And the Round 1 note field still shows my note
  (see the slot-notes NOTE in `plan-strategy.md` — a fix is in flight)

## Scenario: Live draft state survives a reload

- Given a live draft in progress with one pick logged (strip reads "PICK 2 —
  R1.02 · 1 OF 168 LOGGED")
- When I reload the browser on the `/league/<id>/draft` URL
- Then the draft room comes back exactly where it was: "PICK 2",
  "1 OF 168 LOGGED", the same team on the clock, and the logged player still
  on the pick tape
- And the home page's league card shows the in-progress badge
  ("LIVE DRAFT · PICK 2") until the draft is finished or reset

## Scenario: Leagues are isolated from each other

- Given a football league and a baseball league both exist
- When I create, duplicate, or delete one of them, or edit its settings
- Then the other league's card and workspace are untouched — each league
  keeps its own settings, projections, targets, and draft board (they share
  only the per-sport projection libraries on the Intel tab)
