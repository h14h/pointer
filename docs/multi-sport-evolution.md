# Multi-Sport Evolution

This document captures the architectural intent for adding football (or other sports) to DraftSpa. The deep-modules refactoring was designed so that adding a sport means **adding files and extending union types**, not rewriting modules.

## Core Pattern: Sport-Agnostic Shell, Sport-Specific Internals

Each module's `index.ts` exports a sport-agnostic interface. Internally, it dispatches to sport-specific implementations based on discriminated union types (`player._type`, `league.sport`, `settings.sport`).

Consumers (store, components, leaderboard) never branch on sport -- they call `scorePlayer()` or `buildLeaderboard()` and the module handles routing.

## Type Design: Two-Level Discriminated Union

Players use a two-level discriminated union where `_sport` constrains which `_type` values are valid. This prevents cross-sport field contamination at compile time.

```typescript
// _sport narrows _type, _type narrows stat fields
type BatterPlayer  = { _sport: "baseball"; _type: "batter"; ... };
type PitcherPlayer = { _sport: "baseball"; _type: "pitcher"; ... };
type TwoWayPlayer  = { _sport: "baseball"; _type: "two-way"; ... };
type QBPlayer      = { _sport: "football"; _type: "qb"; ... };

// Sport-level groupings
type BaseballPlayer = BatterPlayer | PitcherPlayer | TwoWayPlayer;
type FootballPlayer = QBPlayer | RBPlayer | WRPlayer | TEPlayer | KPlayer | DSTPlayer;
type Player = BaseballPlayer | FootballPlayer;
```

Narrowing guarantees:
- `player._sport === "baseball"` narrows to `BaseballPlayer` (only baseball `_type` values reachable)
- `player._type === "qb"` narrows to `QBPlayer` (implies `_sport === "football"`, correct stat shape)
- `{ _sport: "football", _type: "batter" }` is a compile error
- Accessing `_battingStats` on `QBPlayer` is a compile error

`ScoringSettings` and `League` follow the same pattern, carrying a `sport` discriminant that constrains which scoring categories are available.

**When to add `_sport`**: Add `_sport: "baseball"` to existing player types when football work begins, not before. This requires a persistence migration to backfill the field on existing data.

## Module-by-Module Evolution

| Module | Current State | Evolution When Football Arrives |
|--------|---------------|-------------------------------|
| `lib/scoring/` | `batterScoring.ts`, `pitcherScoring.ts`, `ipMath.ts` (all baseball) | Move into `baseball/` subdirectory, add `football/` alongside. `index.ts` dispatches on `player._type`. Public interface `scorePlayer(player, settings)` unchanged. |
| `lib/eligibility/` | `rules.ts` (baseball position games), `mlbStatsApi.ts`, `import.ts` | Move into `baseball/` subdirectory, add `football/` alongside. Football eligibility is simpler (positions largely fixed). Each sport brings its own data source (MLB API vs NFL API). `formatEligibility()` dispatches on sport. |
| `lib/projections/` | CSV parsing is generic; player type detection and pitching outcomes are baseball-specific | `parser.ts` takes a sport parameter for type detection. `pitchingOutcomes.ts` stays baseball-only. Football simply skips outcome estimation. |
| `lib/leaderboard/` | Sport-agnostic shell with baseball PAR slot mapping in `par.ts` | `SLOT_POSITION_MAP` becomes sport-parameterized. Baseball: C/1B/2B/SS/OF/SP/RP/UTIL. Football: QB/RB/WR/TE/K/DST/FLEX. Filter/sort/search logic is fully sport-agnostic. |
| `lib/draft/` | Fully sport-agnostic | No changes needed. Snake draft, keepers, pick tracking are identical for any sport. |
| `lib/league/` | Default scoring weights and presets are baseball-specific | `createDefaultLeague(name, sport)` returns sport-appropriate defaults. Presets become sport-scoped. Normalization stays generic. `League` gains a `sport` field. |
| `lib/persistence/` | Storage adapter is sport-agnostic | Gains a migration step to backfill `sport: "baseball"` on existing leagues. |

## Playbook: Adding a New Sport

1. **Types** -- Extend `Player` union with sport-specific player types. Add sport-specific `ScoringSettings` variant. Add `Sport` type. Add `sport` field to `League`.
2. **`lib/scoring/`** -- Create `baseball/` dir, move existing files in. Create `football/` dir with sport-specific scoring. Update `index.ts` dispatch.
3. **`lib/eligibility/`** -- Same reorganization: `baseball/` + `football/` dirs.
4. **`lib/projections/`** -- Add sport-specific column detection to parser. Keep pitching outcomes baseball-only.
5. **`lib/leaderboard/par.ts`** -- Add sport-specific slot mapping alongside baseball.
6. **`lib/league/`** -- Add sport-specific presets. Update `createDefaultLeague` for sport param.
7. **`lib/persistence/`** -- Add migration to backfill `sport: "baseball"` on existing leagues.
8. **Store** -- Add sport to league creation flow.
9. **Components** -- Settings sections adapt to show sport-appropriate scoring/roster options.
10. **UI** -- Sport switcher in league creation/settings.

## Files That Are Already Sport-Specific

These files contain baseball domain knowledge and will need `baseball/` subdirectories when a second sport arrives:

- `lib/scoring/batterScoring.ts` -- batter point formulas
- `lib/scoring/pitcherScoring.ts` -- pitcher point formulas, two-way handling
- `lib/scoring/ipMath.ts` -- baseball innings notation
- `lib/eligibility/rules.ts` -- position game thresholds, SP/RP classification
- `lib/eligibility/mlbStatsApi.ts` -- MLB-specific data source
- `lib/eligibility/import.ts` -- MLB API batching/retry (pattern reusable, API specific)
- `lib/eligibility/format.ts` -- baseball position display formatting
- `lib/projections/pitchingOutcomes.ts` -- QS/CG/ShO regression (baseball-only)
- `lib/projections/pitchingOutcomeImport.ts` -- applying baseball estimates
- `lib/leaderboard/par.ts` -- `SLOT_POSITION_MAP` is baseball-specific
- `lib/league/index.ts` -- default scoring weights, roster positions, ESPN/Yahoo/Fantrax baseball presets
