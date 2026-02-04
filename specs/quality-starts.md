# Quality Start Estimation

## Summary
When a pitcher projection omits `QS`, the app estimates projected quality starts using projected
`GS`, `IP`, `ERA`, and `W`. The estimate is used for points calculation and displayed in the
leaderboard QS column for pitchers.

## Estimation Logic
- If `QS > 0`, use the provided QS.
- If `GS <= 0`, `IP <= 0`, or `ERA <= 0`, return `0`.
- Otherwise estimate using:
`avgIpPerStart = IP / GS`
`ipFactor = clamp((avgIpPerStart - 5.0) / 1.5, 0, 1)` (ramps from 5.0 to 6.5 IP)
`lambda = ERA * 6 / 9` (expected earned runs over 6 IP)
`erFactor = PoissonCDF(lambda, 3)` (probability of allowing 3 or fewer ER)
`winFactor = clamp(0.85 + (W / GS) * 0.5, 0.75, 1.1)`
`QS = clamp(roundToTenth(GS * ipFactor * erFactor * winFactor), 0, GS)`

## Notes
- The estimate is intentionally conservative for low-IP starters and teams with low win rates.
- Relievers with `GS = 0` remain at `QS = 0`.
