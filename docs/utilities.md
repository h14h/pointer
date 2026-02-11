# Utilities

## Source Files
- `src/lib/ipMath.ts`
- `src/lib/useDebounce.ts`

## Baseball IP Notation

Standard baseball notation for innings pitched uses the fractional part to represent outs, not decimal fractions:

- `5.0` = 5 innings (15 outs)
- `5.1` = 5 innings + 1 out (16 outs) = 5⅓ innings
- `5.2` = 5 innings + 2 outs (17 outs) = 5⅔ innings
- `5.3` = **invalid** — there is no such thing as 3 outs in a partial inning (3 outs completes the inning)

Only `.0`, `.1`, and `.2` are valid fractional parts. This convention means you cannot do normal arithmetic on IP values — `5.1 + 5.2` is not `10.3` but rather `11.0` (33 outs). The `normalizeIp` function converts baseball IP notation to decimal innings for correct arithmetic.

**Floating-point epsilon.** The fractional part comparison uses a tolerance of `1e-6` because `5.2 - 5.0` may not produce exactly `0.2` in floating-point.

## Dependents
- [Scoring](scoring.md) and [Pitching Outcomes](pitching-outcomes.md) use `normalizeIp` for IP conversion
- [Leaderboard](leaderboard.md) uses `isValidBaseballIp` to decide whether to use baseball IP math for an entire projection group
- [Settings Page](settings-page.md) uses `useDebouncedCallback` for scoring input debouncing

## Edge Cases
- The debounce hook does not clean up on unmount — the callback fires into a stale closure harmlessly.
