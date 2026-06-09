# How Pointer Works

This document maps the codebase into domains, each with a dedicated spec in `docs/`. See [WHY.md](WHY.md) for project purpose and values, and [README.md](README.md) for quick start.

Each spec is the authoritative reference for its domain. When code changes, the relevant spec should be updated to match.

## Domain Map

| Domain | Description | Source Files | Spec |
|--------|-------------|-------------|------|
| Types & Schemas | Core data structures used across the app | `src/types/` (`player.ts`, `league.ts`, `draft.ts`, `projection.ts`, `football.ts`, `index.ts`) | [docs/types.md](docs/types.md) |
| Football | Fantasy football domain: scoring presets (Standard/Half PPR/PPR), projections CSV parsing, FLEX/Superflex-aware PAR, and the ranking pipeline | `src/lib/football/` | [docs/football.md](docs/football.md) |
| Pro / Monetization | Clerk auth + billing and Convex cloud league sync for the Pro tier; app remains fully functional without configuration | `src/lib/pro/`, `src/components/pro/`, `src/components/providers/AppProviders.tsx`, `src/app/pricing/page.tsx`, `src/proxy.ts`, `convex/` | [docs/monetization.md](docs/monetization.md) |
| Scoring | Point calculation, scoring presets, and league-specific weight application | `src/lib/scoring/` | [docs/scoring.md](docs/scoring.md) |
| Draft | Snake draft math, keeper reservations, pick tracking, and pure state transformers | `src/lib/draft/` | [docs/state.md](docs/state.md) |
| League | League creation, normalization, validation, defaults, and scoring presets | `src/lib/league/` | [docs/state.md](docs/state.md) |
| Eligibility | Position eligibility computation, pitcher role classification, MLB Stats API, and import orchestration | `src/lib/eligibility/` | [docs/eligibility.md](docs/eligibility.md) |
| Projections | CSV parsing, pitching outcome estimation, public datasets, and projection group helpers | `src/lib/projections/` | [docs/csv-parsing.md](docs/csv-parsing.md) |
| Leaderboard | Ranking pipeline, PAR calculation, filtering, sorting, and search | `src/lib/leaderboard/` | [docs/leaderboard.md](docs/leaderboard.md) |
| Persistence | Split localStorage adapter and state migrations | `src/lib/persistence/` | [docs/state.md](docs/state.md) |
| Replacement Value (PAR) | Points Above Replacement calculation using slot-based replacement levels | `src/lib/leaderboard/par.ts` | [docs/paring-value.md](docs/paring-value.md) |
| Pitching Outcomes | Regression estimators for QS/CG/ShO used when import-time estimation is explicitly selected | `src/lib/projections/pitchingOutcomes.ts`, `src/lib/projections/pitchingOutcomeImport.ts` | [docs/pitching-outcomes.md](docs/pitching-outcomes.md) |
| MLB Stats API | Fetching real-time stats from MLB's public API for eligibility enrichment | `src/lib/eligibility/mlbStatsApi.ts` | [docs/mlb-stats-api.md](docs/mlb-stats-api.md) |
| Public Datasets | Public catalog/bootstrap flow for the built-in Tigris-backed historical dataset | `src/lib/projections/publicDatasets.ts`, `src/server/publicDatasets/storage.ts`, `src/app/api/public-datasets/**`, `src/components/PublicDatasetBootstrap.tsx`, `scripts/publish-public-dataset.ts`, `data/public-datasets/**` | [docs/public-datasets.md](docs/public-datasets.md) |
| State Management | Zustand store as thin coordination layer over domain modules | `src/store/index.ts` | [docs/state.md](docs/state.md) |
| Leaderboard UI | Player ranking table with sorting, filtering, draft interactions | `src/components/Leaderboard.tsx`, `src/components/FootballLeaderboard.tsx`, `e2e/leaderboard.spec.ts` | [docs/leaderboard.md](docs/leaderboard.md) |
| CSV Upload Workflow | Upload modal, file handling, eligibility import, and optional pitching-outcome estimation | `src/components/CsvUpload.tsx`, `src/components/FootballCsvUpload.tsx` | [docs/csv-upload-workflow.md](docs/csv-upload-workflow.md) |
| Settings Page | Dedicated settings route with sectioned Projections, Scoring, Roster, Draft, and League controls | `src/app/settings/page.tsx`, `src/components/settings/*.tsx` | [docs/settings-page.md](docs/settings-page.md) |
| Header | Top navigation, projection/league selection, and global controls | `src/components/Header.tsx` | [docs/header.md](docs/header.md) |
| UI System | Shared visual tokens, shadcn/ui integration, and reusable UI primitives for consistent styling | `src/app/globals.css`, `src/components/ui/*.tsx`, `src/lib/utils.ts`, `components.json` | [docs/ui-system.md](docs/ui-system.md) |
| Utilities | Debounce hook and other shared helpers | `src/lib/useDebounce.ts` | [docs/utilities.md](docs/utilities.md) |

## Module Architecture

Business logic lives in 7 deep modules under `src/lib/`. Each module exposes a simple public interface through `index.ts` and hides implementation details in internal files.

### Modules

| Module | Public Interface | Key Exports |
|--------|-----------------|-------------|
| `lib/scoring/` | Score any player type against league weights | `calculatePlayerPoints`, `calculateBatterPoints`, `calculatePitcherPoints`, `normalizeIp`, `isValidBaseballIp` |
| `lib/draft/` | Pure state transformers for snake-draft lifecycle | `advancePick`, `undoLastPick`, `setKeeper`, `removeKeeper`, `resetDraft`, `getDraftPickContext`, `canEditDraftSetup`, `getPickContext` |
| `lib/league/` | League creation, normalization, validation, and scoring presets | `createDefaultLeague`, `normalizeLeague`, `normalizeLeagueSettings`, `isStructureChangeSafe`, `scoringPresets`, `presetNames` |
| `lib/eligibility/` | Position eligibility computation, formatting, MLB API fetch, and import orchestration | `computeHitterEligibility`, `computePitcherEligibility`, `mergeTwoWayEligibility`, `formatEligibilityForLeaderboard`, `fetchSeasonStatsForPlayers`, `runProjectionEligibilityImport` |
| `lib/projections/` | CSV parsing, pitching outcome estimation, public dataset handling, and projection group helpers | `parsePlayerCSV`, `mergePlayers`, `applyPitchingOutcomeEstimates`, `parsePublicDatasetManifest`, `createProjectionGroupFromPublicDataset`, `isProtectedProjectionGroup` |
| `lib/leaderboard/` | Stepped ranking pipeline (build, filter, sort) and PAR calculation | `buildBaseRankedPlayers`, `buildFilterMetadata`, `filterRankedPlayers`, `sortLeaderboardRows`, `calculatePAR`, `buildPlayerSearchText` |
| `lib/persistence/` | Split localStorage adapter and version migration | `splitStorage`, `migrate` |

### Dependency Graph

```
scoring  draft  league        (leaf modules — no lib/ dependencies)
   |              |
   v              v
projections    persistence    (projections depends on scoring; persistence depends on league)
   |
   v
eligibility                   (no lib/ dependencies, but leaderboard depends on it)
   |
   v
leaderboard                   (depends on scoring + eligibility)
```

- **scoring**, **draft**, **league** are leaf modules with no cross-module dependencies
- **projections** imports from scoring (IP normalization for pitching outcome estimation)
- **leaderboard** imports from scoring (point calculation) and eligibility (position formatting)
- **persistence** imports from league (normalization functions for migrations)
- **eligibility** has no lib/ module dependencies

### Store as Coordination Layer

The Zustand store (`src/store/index.ts`) is a thin coordinator, not a logic owner. Each store action is a one-liner that calls a pure domain function from the appropriate module, then writes the result back. The store provides ~20 actions across league management, projections, draft, and preferences. See [docs/state.md](docs/state.md) for the full action list.

### Types Split

Types are split into 4 domain files under `src/types/` with a barrel re-export in `index.ts`:

| File | Contents |
|------|----------|
| `player.ts` | `Player`, `BatterPlayer`, `PitcherPlayer`, `TwoWayPlayer`, stat types |
| `league.ts` | `League`, `ScoringSettings`, `LeagueSettings`, `RosterSettings`, `Position`, `RosterSlot` |
| `draft.ts` | `DraftState`, `DraftPick`, `DraftFormat` |
| `projection.ts` | `ProjectionGroup`, `ProjectionGroupSource`, `IdSource`, `Eligibility`, `RankedPlayer`, `AppState` |

All existing `@/types` imports continue to work through the barrel.

## Cross-Cutting Concerns

Some features span multiple domains. Start with the linked spec and follow its dependency references.

- **Two-way players** — Handled across CSV parsing, scoring, eligibility, and state. Start with [docs/types.md](docs/types.md).
- **Draft mode** — Spans state management, leaderboard, and header. Start with [docs/state.md](docs/state.md).
- **Persistence & migrations** — Covered in [docs/state.md](docs/state.md).
- **Built-in public baseline** — Spans public datasets, state persistence, leaderboard empty-state behavior, and header destructive flows. Start with [docs/public-datasets.md](docs/public-datasets.md).
- **Projection management** — Spans header selection, settings management, upload flow, public datasets, and eligibility import. Start with [docs/settings-page.md](docs/settings-page.md).
- **UI consistency** — All visual components should use shared primitives from `src/components/ui/` or the [shadcn/ui catalog](https://ui.shadcn.com/docs/components). Before creating new visual patterns, check [docs/ui-system.md](docs/ui-system.md).

## Spec Conventions

Specs are **briefing documents, not reference manuals**. They exist to tell you what the code *can't* tell you on its own.

**Include:**
- Domain knowledge (e.g., baseball IP notation, eligibility thresholds)
- Design decisions and their rationale (e.g., why TwoWayPlayer lifts identifiers)
- Invariants and constraints (e.g., drafted/keeper mutual exclusivity)
- Non-obvious edge cases and guard clauses
- Cross-domain relationships and dependency context

**Do not include:**
- Function signatures, parameter lists, or return types
- Type property tables or interface definitions
- State variable tables, event handler inventories, or props interfaces
- Anything an agent can learn by reading the source file directly

### Complex UI Behavior

When a UI interaction has subtle rules, competing interpretations, or a history of regressions, capture the behavior in Cucumber-style BDD language before or alongside implementation.

Use short `Given / When / Then` scenarios in the relevant spec and mirror the same scenarios in automated UI tests. This is especially useful for:
- controls whose meaning depends on domain concepts like draft slots, ranking, or roster constraints
- interactions where multiple outcomes seem plausible from the UI alone
- behaviors that previously required back-and-forth clarification

Keep the scenarios concrete and example-driven rather than abstract. Prefer a canonical fixture like "one team with keepers in rounds 5 and 6" over generic prose when that makes the intended behavior unambiguous.

When updating a spec after a code change, ask: *"Would an agent need to know this to work effectively, or could it just read the code?"* If the answer is the latter, leave it out.

### Source File Lists

Source Files lists in specs must be explicit. List every file the spec covers by name. When adding a new file to a domain, add it to the spec's Source Files section. The domain map in this document may use wildcards for readability, but the spec is the authoritative inventory.

## Maintenance

This document and its specs should always reflect the current codebase. When code changes, update the relevant spec. If a domain is added or removed, update this table.

## Quality Assurance

Run all checks before completing any code change. Failure in any step blocks the change.

### Scripts (use `bun`)

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `bun run test` | Unit tests for `src/lib` |
| `test:ui` | `bun run test:ui` | Component/UI tests (Vitest, jsdom) |
| `lint` | `bun run lint` | ESLint (includes React Compiler checks) |
| `build` | `bun run build` | Next.js build with TypeScript validation |
| `test:visual` | `bun run test:visual` | Playwright screenshot regression tests (leaderboard table) |
| `test:visual:update` | `bun run test:visual:update` | Regenerate screenshot baselines after intentional visual changes |

### Required Verification Order

1. Review whether `HOW.md` or any relevant spec in `docs/` needs to be updated for the code change, and update it if needed. If you added, renamed, or removed a source file, verify it appears (or is removed) in the relevant spec's Source Files section and the domain map above
2. `bun run test` — all unit tests must pass
3. `bun run test:ui` — all UI tests must pass
4. `bun run test:visual` — all screenshot regression tests must pass (requires dev server running on port 3000)
5. `bun run lint` — zero errors (warnings are acceptable when React Compiler is known to handle the case)
6. `bun run build` — TypeScript must compile cleanly

### Running Everything

```bash
review specs/docs first, then run:
bun run test && bun run test:ui && bun run test:visual && bun run lint && bun run build
```

### Notes

- **ESLint** is configured via `eslint.config.mjs` using `eslint-config-next`. The `react-hooks/incompatible-library` warning for TanStack Table is a known limitation — React Compiler handles it automatically and no suppression is needed.
- **React Compiler** (Next.js 16 + Turbopack) handles memoization automatically. The `react-hooks/exhaustive-deps` warnings for `batters`/`pitchers`/`twoWayPlayers` in `Leaderboard.tsx` are suppressed inline because the compiler manages those dependencies.
- **`.eslintignore` is not used** — ESLint v9 requires `globalIgnores` in `eslint.config.mjs` instead.
- **TypeScript** is validated as part of `build`, not as a separate `tsc` call.
- **Playwright** screenshot tests require the dev server on port 3000 and Chromium installed (`bunx playwright install chromium`). The tests reuse the running dev server in local development. See `AGENTS.md` for details on adding new visual tests.
