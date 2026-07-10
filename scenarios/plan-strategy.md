# Scenario: Plan tab — pick timeline, targets, and slot notes

The Plan tab is the pre-draft strategy surface: a snake-draft pick timeline
for my team's slots, a targets shortlist, and a tier-supply readout. It is
derived live from the league's config (my team, league size, roster shape)
and from draft activity.

Verified against the running app on 2026-07-10.

## Background

- Given a fresh football league (12 teams, built-in projections, my team =
  Team 1)
- And I am on its workspace's "PLAN" tab

## Scenario: The pick timeline shows one slot per roster spot

- Then I see a panel titled "PICK TIMELINE — YOUR SLOTS" with a header like
  "PICKS 1 / 24 / 25 / 48 / 49 …" (my snake-draft overall pick numbers)
- And one row per roster slot (14 rows for the default football roster),
  labeled "R1.01" through "R14.12" with the overall pick number
  ("p1 overall", "p24 overall", …)
- And the next undrafted slot is marked "ON DECK" with the hint "start the
  live draft to log this slot. top of board: <top two available players>"
- And later slots are marked "PROJECTED" with "likely on board: <players>"
  guesses for that pick
- And changing "Your team" on the Config tab recomputes every pick number
  (e.g. picking Team 5 changes the header to "PICKS 5 / 20 / 29 / 44 / 53 …")

## Scenario: Flagging targets

- Given the "TARGETS" panel reads "0 FLAGGED" with the hint "flag players
  from the search above — targets glow in the draft room."
- When I type "chase" into the "add a target — search the board…" field
- Then a shortlist of up to 5 matching players drops down, each with name,
  position, team, and board rank (e.g. "Ja'Marr Chase — WR · CIN · rk 24")
- When I click a player in the shortlist
- Then the panel header reads "1 FLAGGED" and the player appears in the list
  with take-by guidance derived from my pick slots
  ("Ja'Marr Chase — WR · CIN · rk 24 · take by p25")
- When I click the "✕" on a flagged player
- Then the player is removed and the count returns to "0 FLAGGED"

## Scenario: Slot notes

- Given every timeline row has a note field placeholder-stamped
  "slot note — pivots, fallbacks, a position to force"
- When I type a note into the Round 1 row and click away
- Then the note is kept on that row (still there after switching to another
  tab and back, and after a page reload)
- And notes on different rounds stay on their own rows

> NOTE (2026-07-10): Slot notes have a known bug that is being fixed in
> parallel — do not treat the exact save behavior above as locked. In this
> verification run, fill-then-blur did persist, but the browser console logs
> a Base UI error on blur ("A component is changing the default value state
> of an uncontrolled FieldControl after being initialized"), and other input
> patterns may lose the note. Re-verify and firm this section up once the
> fix lands.

## Scenario: Tier supply drains as players are drafted

- Given the "TIER SUPPLY" panel ("REMAINING VS. PRINTED POOL") lists, per
  position (QB/RB/WR/TE), tier rows like "T1 — 3 of 3"
- When a tiered player is drafted in the live draft room (e.g. Christian
  McCaffrey, an RB tier-1)
- Then that tier's count decrements ("RB T1 — 1 of 2") while the printed
  pool denominator stays fixed

## Scenario: Logged picks land on the timeline

- Given I logged my first pick in the live draft room and exited
- Then the "R1.01" row's status chip reads "LOGGED" and shows the player
  ("Christian McCaffrey — RB · SF · 366 pts") instead of the on-deck hint
