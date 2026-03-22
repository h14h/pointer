# Replacement Value (PAR)

## Source Files
- `src/lib/calculatePAR.ts`
- `src/lib/__tests__/calculatePAR.test.ts`

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

**Replacement level** is the projected points of the worst-starting player at a given position. It's computed from league roster settings, not from the actual drafted roster (PAR is a static pre-draft value).

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

## Player PAR Selection

For a player's overall PAR, the system selects the **maximum PAR** across all slot types the player is eligible to fill **and that have allocated roster slots**. This represents the best-position fit for the player.

**Example:** A player eligible at both 2B and SS with PAR values of +15 (at 2B) and +20 (at SS) would have an overall PAR of +20.

**Note:** Slots with zero allocated positions (e.g., DH, CI, MI in standard ESPN/Yahoo configs) are skipped entirely. A player eligible at C, 1B, and DH uses C and 1B for PAR calculation — DH is ignored since it has 0 slots. A player only eligible at positions with zero slots (e.g., only LF with no OF allocation) would use the parent pooled slot (OF) since LF feeds into the OF pool.

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

**Zero-slot positions are skipped.** Positions with zero allocated roster slots (e.g., individual LF/CF/RF in most league configs, or individual IF in standard configs) do not contribute to replacement calculation. This prevents players who are only eligible at those positions from appearing to have artificially high PAR. Instead, those players are evaluated using the parent pooled slot (OF for outfielders, P for pitchers).

**Max PAR rationale.** Taking the maximum PAR across eligible positions reflects the reality that a player with multi-position eligibility provides the most value at their strongest position. A player who qualifies at both 2B and SS but provides more value at SS should be evaluated at SS.

**Display format.** PAR uses `+` prefix for positive values (e.g., `+15.3`) and standard negative notation (e.g., `-8.7`). Color coding: green for positive, red for negative, muted gray for zero.
