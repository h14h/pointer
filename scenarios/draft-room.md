# Scenario: Live draft room — logging picks against the board

The draft room is a full-screen, dark-mode takeover for draft night. The
user manually logs every pick (their own and everyone else's) to keep
DraftSpa aligned with their real draft platform — nothing ever auto-advances.

Verified against the running app on 2026-07-10.

## Background

- Given a fresh football league (12 teams, 14 roster slots, my team = Team 1)
- And I enter the draft room via "START LIVE DRAFT" in the workspace (the
  "LIVE DRAFT" action on the home-page league card deep-links to the same
  place)

## Scenario: The sync strip is the source of truth

- Then the top strip shows "LIVE DRAFT · <league name>"
- And an "on the board" block reading "PICK 1" with "R1.01 · 0 of 168 logged"
  (total picks = roster slots × league size)
- And an "on the clock" block reading "YOU — on the clock" with "your pick —
  log it below", highlighted because pick 1 belongs to my team
- And the reminder "keep pick number aligned with your draft platform"
- And an "EXIT LIVE DRAFT" action

## Scenario: The pick tape lays out the whole snake draft

- Then a tape lists every pick of every round ("R1.01 · T1" … "R14.12"),
  snaking (Team 12 picks twice in a row at the R1/R2 turn)
- And my slots are marked "YOU"; unlogged picks show "—"

> NOTE (2026-07-10): Tape team abbreviations are ambiguous with default
> names — "Team 1", "Team 10", "Team 11", and "Team 12" all abbreviate to
> "T1" on the tape. Real (renamed) team names abbreviate by initials and are
> fine. Cosmetic, but worth a look.

## Scenario: Quick-logging a pick by typing

- Given the quick-log bar is auto-focused on entry, placeholder "log a pick —
  type a name, Enter confirms to Team 1"
- And (because it is my pick) it recommends the top of the board:
  "recommend: Christian McCaffrey (RB · 366 pts) — Enter takes the
  recommendation"
- When I type a few letters of a player's name and press Enter
- Then the pick is logged to whichever team is on the clock, with a receipt
  in the bar ("logged: p1 C. McCaffrey → Team 1") and an "undo" action
- And the sync strip advances: "PICK 2", "R1.02 · 1 of 168 logged", on the
  clock "Team 2", and my countdown "you in 22 picks (p24)"
- And the tape fills in "R1.01 · T1 — C. McCaffrey"
- And the logged player disappears from the board list below
- And pressing "/" anywhere refocuses the quick-log input

## Scenario: Logging from the board list

- Given the board panel below lists ranked available players with position
  filter chips ("ALL", "QB", "RB", "WR", "TE", "K", "DST") and columns
  RNK / PLAYER / POS · TEAM / PROJ / PAR
- When I click a player row's "+ LOG" button
- Then that player is logged to the on-clock team exactly as with the
  quick-log bar, and the strip advances

## Scenario: Undo reverses the last logged pick

- Given at least one pick is logged
- When I click "undo" next to the receipt (or "UNDO LAST PICK")
- Then the last pick is removed: the strip steps back to the prior pick
  number, the tape slot returns to "—", and the player returns to the board

## Scenario: Exiting draft night

- When I click "EXIT LIVE DRAFT"
- Then I return to the league workspace on the Plan tab
- And the Plan timeline shows my logged slot as "LOGGED" with the player name
- And the "TIER SUPPLY" counts reflect the drafted players
- And the home-page league card now carries a "LIVE DRAFT · PICK <n>" badge —
  re-entering the draft room resumes exactly where I left off
