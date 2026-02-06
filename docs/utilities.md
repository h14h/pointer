# Utilities

## Purpose

Shared helper functions used across multiple domains. Covers baseball-specific IP math and a React debounce hook.

## Source Files

- `src/lib/ipMath.ts`
- `src/lib/useDebounce.ts`

## Dependencies

- React (`useRef`, `useCallback`)

## Dependents

- [Scoring](scoring.md) — uses `normalizeIp` for IP conversion
- [Pitching Outcomes](pitching-outcomes.md) — uses `normalizeIp` for IP conversion
- [Leaderboard](leaderboard.md) — uses `isValidBaseballIp` for display logic
- [Scoring Form](scoring-form.md) — uses `useDebouncedCallback` for input debouncing

## Types

### `NormalizedIp`

```typescript
{
  outs: number;    // Total outs (whole innings × 3 + fractional outs)
  innings: number; // Decimal innings (outs / 3)
  valid: boolean;  // Whether input was valid baseball IP format
}
```

## API Reference

### `normalizeIp(ip: number): NormalizedIp`

Converts a baseball innings pitched value from standard notation to a normalized format.

**Baseball IP notation:** The fractional part represents outs, not decimals. `5.1` means 5 innings and 1 out (5⅓ innings = 16 outs). `5.2` means 5 innings and 2 outs (5⅔ innings = 17 outs). Only `.0`, `.1`, and `.2` are valid fractions.

**Parameters:**
- `ip` — Raw IP value in baseball notation.

**Returns:** `NormalizedIp` with converted values.

**Behavior:**
- Returns `{ outs: 0, innings: 0, valid: false }` if input is not finite, negative, or has an invalid fractional part (anything other than .0, .1, .2).
- Uses epsilon tolerance of `1e-6` for floating-point comparison of the fractional part.
- Converts valid inputs: `whole * 3 + fracDigit` = total outs, `outs / 3` = decimal innings.

**Examples:**
- `normalizeIp(5.0)` → `{ outs: 15, innings: 5, valid: true }`
- `normalizeIp(5.1)` → `{ outs: 16, innings: 5.333..., valid: true }`
- `normalizeIp(5.2)` → `{ outs: 17, innings: 5.666..., valid: true }`
- `normalizeIp(5.3)` → `{ outs: 0, innings: 0, valid: false }`
- `normalizeIp(-1)` → `{ outs: 0, innings: 0, valid: false }`

### `isValidBaseballIp(ip: number): boolean`

Returns whether a value is valid baseball IP notation.

**Parameters:**
- `ip` — Value to validate.

**Returns:** `true` if the fractional part is .0, .1, or .2 and the value is non-negative and finite.

**Implementation:** Calls `normalizeIp(ip).valid`.

### `useDebouncedCallback<T>(callback: T, delay: number): T`

React hook that returns a debounced version of a callback function.

**Type Parameter:**
- `T extends (...args: any[]) => void`

**Parameters:**
- `callback` — Function to debounce.
- `delay` — Delay in milliseconds.

**Returns:** A debounced function with the same signature as `callback`.

**Behavior:**
- Uses `useRef` to store a timeout handle.
- Clears any pending timeout on each invocation, then schedules `callback` after `delay` ms.
- Only the last call within the debounce window executes.
- Memoized with `useCallback` — dependency array is `[callback, delay]`.

## Edge Cases

- **IP notation:** `.1` = 1 out, `.2` = 2 outs. `.3` and above are invalid. This is a baseball convention, not decimal math.
- **Floating-point precision:** The epsilon of `1e-6` handles floating-point arithmetic artifacts (e.g., `5.2 - 5.0` may not be exactly `0.2`).
- **Debounce cleanup:** The timeout is not explicitly cleared on component unmount. This is intentional — the callback fires into a stale closure harmlessly.
