# Replacement Value (PAR)

## Source Files
- `src/lib/leaderboard/par.ts`
- `src/lib/leaderboard/calculatePAR.test.ts`

## Dependencies
- [Types](types.md) — `RankedPlayer`, `LeagueSettings`
- [Eligibility](eligibility.md) — position eligibility computation
- [Scoring](scoring.md) — `projectedPoints` calculation

## Dependents
- [Leaderboard](leaderboard.md) — displays PAR column
- [State](state.md) — `leagueSettings` passed to PAR calculation

## How PAR Works

**Definition.** PAR (Points Above Replacement) measures how many projected points a player scores above the "replacement-level" player at their position. Higher PAR = more valuable.

**Formula:** `PAR = projectedPoints - replacementLevel`

**Replacement level** is the projected points of the best waiver-wire player at a given position after the league's active roster demand is satisfied. It's computed from league roster settings, not from the actual drafted roster (PAR is a static pre-draft value).

## Slot-Based Replacement Logic

Replacement is computed from a single global starter allocation. The system fills every active hitter and pitcher slot across the league, then defines replacement for each slot type as the **best eligible unrostered player** left over from that full allocation.

**Slots with zero allocated positions are skipped** — their eligible players use the pooled parent slot instead.

| Slot Type | Positions Pooled | Replacement Logic |
|-----------|------------------|------------------|
| **C** | C | Best unrostered catcher after all active slots are filled |
| **1B** | 1B | Best unrostered 1B after all active slots are filled |
| **2B** | 2B | Best unrostered 2B after all active slots are filled |
| **3B** | 3B | Best unrostered 3B after all active slots are filled |
| **SS** | SS | Best unrostered SS after all active slots are filled |
| **LF** | LF | Best unrostered LF (skipped if 0 slots — use OF) |
| **CF** | CF | Best unrostered CF (skipped if 0 slots — use OF) |
| **RF** | RF | Best unrostered RF (skipped if 0 slots — use OF) |
| **DH** | DH | Best unrostered DH |
| **OF** | LF, CF, RF | Best unrostered OF after the full roster is filled |
| **CI** | 1B, 3B | Best unrostered CI after the full roster is filled |
| **MI** | 2B, SS | Best unrostered MI after the full roster is filled |
| **IF** | 1B, 2B, 3B, SS | Best unrostered IF after the full roster is filled |
| **UTIL** | All fielding positions | Best unrostered hitter after the full roster is filled |
| **SP** | SP | Best unrostered SP (skipped if 0 slots — use P) |
| **RP** | RP | Best unrostered RP (skipped if 0 slots — use P) |
| **P** | SP, RP | Best unrostered pitcher after the full roster is filled |

**Skipped slots:** If a slot has 0 allocated positions (e.g., LF/CF/RF in most ESPN/Yahoo configs), it is not used for replacement calculation. Players eligible only at skipped slots use the parent pooled slot instead (OF for outfielders, P for pitchers).

## Weekly Start Limits

When `leagueSettings.weeklyStartLimit` is set, pitcher PAR uses start-scarcity-adjusted effective points before replacement levels are calculated.

- Starter capacity per team is estimated as `SP slots + P slots + bench slots`. Explicit `RP` slots are excluded because they do not create starter capacity.
- Expected starts per team per week are `starterCapacity * 1.2`, where `1.2` is the current first-pass assumption for starts per rostered SP per week.
- If expected weekly starts are above the weekly cap, start scarcity weight is the excess-start fraction: `(expectedStarts - weeklyStartLimit) / expectedStarts`.
- If expected weekly starts are at or below the cap, start scarcity weight is the Poisson probability that a team still reaches the cap in a given week. This keeps the penalty non-zero in loose-cap leagues while allowing it to fade when the cap is unlikely to matter.
- Replacement points per start are estimated from the marginal starter-like pitcher at the starter-capacity boundary, divided by `1.2 * 25` season starts. The `25` week season is another first-pass assumption.
- Each pitcher then receives an effective-points adjustment: `effectivePoints = projectedPoints - (projectedGS * replacementPointsPerStart * startScarcityWeight)`.
- Pitchers with `GS = 0` receive no start penalty. RP-eligible projected starters, SP/RP swingmen, and two-way pitchers pay the penalty in proportion to projected starts.
- Normal starter-side slot replacement runs on those effective points.
- Relief-side replacement demand is estimated as `explicit RP slots + flexible over-cap starter capacity`, where flexible over-cap capacity is capped to `P slots + bench slots`. This prevents explicit `SP` slots from creating RP-only demand.
- Relief-side replacement uses projected reliever share (`1 - GS / G`) rather than SP/RP eligibility alone. In a `9 P`, `3 bench`, `11 start` league, the flexible over-cap capacity is about `2.8` slots per team, so the true-reliever replacement boundary lands around the 35th reliever in a 12-team league.
- Pitcher PAR blends starter-side PAR and relief-side PAR by projected usage share. Pure RPs use the relief-side replacement boundary; pure SPs use starter-side replacement after the start penalty; swingmen land between them.

This is intentionally a draft-oriented approximation rather than a full weekly lineup simulation. It prices the opportunity cost of starts in capped-start formats without inventing synthetic SP/RP roster buckets.

## Player PAR Selection

For a player's overall PAR, the system selects the **maximum PAR** across all slot types the player is eligible to fill **and that have allocated roster slots**. This represents the best-position fit for the player.

**Example:** A player eligible at both 2B and SS with PAR values of +15 (at 2B) and +20 (at SS) would have an overall PAR of +20.

**Note:** Slots with zero allocated positions (e.g., DH, CI, MI in standard ESPN/Yahoo configs) are skipped entirely. A player eligible at C, 1B, and DH uses C and 1B for PAR calculation — DH is ignored since it has 0 slots. A player only eligible at positions with zero slots (e.g., only LF with no OF allocation) would use the parent pooled slot (OF) since LF feeds into the OF pool.

**Capped-start pitcher adjustment.** When `weeklyStartLimit` is enabled, pitcher PAR is computed from start-scarcity-adjusted effective points. Starter-side PAR still selects the maximum PAR among eligible `SP`/`RP`/`P` slots, but pitchers with projected starts have paid the start opportunity cost before replacement levels are computed. Reliever-side PAR uses the true-reliever replacement boundary created by explicit `RP` slots and flexible over-cap starter capacity.

## Two-Way Players

Two-way players are evaluated separately as batters and pitchers:

1. **Batting PAR** — max PAR across all batter slot types
2. **Pitching PAR** — max PAR across SP/RP/P slot types
3. **Overall PAR** — `max(battingPar, pitchingPar)`

This represents the player's best contribution as either a batter or pitcher.

## League Size Scaling

Replacement level scales with league size because deeper leagues draft more players, lowering the replacement baseline.

- **6-team league:** Replacement at each position is higher (fewer teams = fewer starting slots)
- **20-team league:** Replacement at each position is lower (more teams = more starting slots)

The replacement threshold is computed once at PAR calculation time, using the static roster configuration. It does not update during the draft.

## Design Decisions

**Static vs. dynamic replacement.** PAR uses static replacement levels computed from the full player pool and league roster settings. This is the pre-draft baseline. During a draft, the actual replacement level (available free agents) changes, but PAR does not — it's a draft value tool, not a live valuation.

**Global allocation.** All replacement levels come from the same final rostered universe. This keeps pooled slots aligned with their component positions, so `MI` reflects the better of the available `2B`/`SS` leftovers, `CI` reflects the better of `1B`/`3B`, and `UTIL` reflects the best hitter actually left on the waiver wire after the whole starting lineup is filled.

**Start-limit approximation.** Weekly start limits make starts a scarce resource. The first-pass model assumes `1.2` starts per rostered SP per week and a `25` week fantasy season; both constants are defined in `src/lib/leaderboard/par.ts` and should become configurable if owners need league-specific tuning. Starter capacity is estimated as `SP + P + bench`, and the start penalty scales with the share of expected starts above the cap. At or below the cap, a Poisson tail probability provides a small non-zero penalty for loose-cap leagues where individual teams can still run into clustered start weeks. When the cap leaves flexible starter-capable slots over-provisioned, those slots become relief-side replacement demand, so true RPs are compared against the marginal reliever needed to absorb that free pitching capacity.

**Zero-slot positions are skipped.** Positions with zero allocated roster slots (e.g., individual LF/CF/RF in most league configs, or individual IF in standard configs) do not contribute to replacement calculation. This prevents players who are only eligible at those positions from appearing to have artificially high PAR. Instead, those players are evaluated using the parent pooled slot (OF for outfielders, P for pitchers).

**Max PAR rationale.** Taking the maximum PAR across eligible positions reflects the reality that a player with multi-position eligibility provides the most value at their strongest position. A player who qualifies at both 2B and SS but provides more value at SS should be evaluated at SS.

**Display format.** PAR uses a `+` prefix for positive values and standard negative notation. The leaderboard displays rounded whole numbers; color coding is green for positive, red for negative, muted gray for zero.
