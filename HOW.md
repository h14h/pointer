# How Pointer Works

This document maps the codebase into domains, each with a dedicated spec in `docs/`. See [WHY.md](WHY.md) for project purpose and values, and [README.md](README.md) for quick start.

Each spec is the authoritative reference for its domain. When code changes, the relevant spec should be updated to match.

## Domain Map

| Domain | Description | Source Files | Spec |
|--------|-------------|-------------|------|
| Types & Schemas | Core data structures used across the app | `src/types/index.ts` | [docs/types.md](docs/types.md) |
| CSV Parsing | Upload, detect, and normalize player data from CSV/TSV files | `src/lib/csvParser.ts` | [docs/csv-parsing.md](docs/csv-parsing.md) |
| Scoring | Point calculation, scoring presets, and league-specific weight application | `src/lib/calculatePoints.ts`, `src/lib/presets.ts` | [docs/scoring.md](docs/scoring.md) |
| Replacement Value (PAR) | Points Above Replacement calculation using slot-based replacement levels | `src/lib/calculatePAR.ts` | [docs/paring-value.md](docs/paring-value.md) |
| Pitching Outcomes | Regression estimators for QS/CG/ShO used when import-time estimation is explicitly selected | `src/lib/pitchingOutcomes.ts`, `src/lib/qualityStarts.ts`, `src/lib/pitchingOutcomeImport.ts` | [docs/pitching-outcomes.md](docs/pitching-outcomes.md) |
| Eligibility | Position eligibility computation and pitcher role classification | `src/lib/eligibility.ts` | [docs/eligibility.md](docs/eligibility.md) |
| MLB Stats API | Fetching real-time stats from MLB's public API for eligibility enrichment | `src/lib/mlbStatsApi.ts` | [docs/mlb-stats-api.md](docs/mlb-stats-api.md) |
| Public Datasets | Public catalog/bootstrap flow for the built-in Tigris-backed historical dataset | `src/lib/publicDatasets.ts`, `src/server/publicDatasets/storage.ts`, `src/app/api/public-datasets/**`, `src/components/PublicDatasetBootstrap.tsx`, `scripts/publish-public-dataset.ts`, `data/public-datasets/**` | [docs/public-datasets.md](docs/public-datasets.md) |
| State Management | Zustand store, persistence, and schema migrations | `src/store/index.ts` | [docs/state.md](docs/state.md) |
| Leaderboard | Player ranking table with sorting, filtering, draft interactions, and extracted derivation helpers | `src/components/Leaderboard.tsx`, `src/lib/leaderboardDerived.ts`, `e2e/leaderboard.spec.ts` | [docs/leaderboard.md](docs/leaderboard.md) |
| CSV Upload Workflow | Upload modal, file handling, eligibility import, and optional pitching-outcome estimation | `src/components/CsvUpload.tsx` | [docs/csv-upload-workflow.md](docs/csv-upload-workflow.md) |
| Settings Page | Dedicated settings route with sectioned Projections, Scoring, Roster, Draft, and League controls | `src/app/settings/page.tsx`, `src/components/settings/*.tsx` | [docs/settings-page.md](docs/settings-page.md) |
| Header | Top navigation, projection/league selection, and global controls | `src/components/Header.tsx` | [docs/header.md](docs/header.md) |
| UI System | Shared visual tokens, shadcn/ui integration, and reusable UI primitives for consistent styling | `src/app/globals.css`, `src/components/ui/*.tsx`, `src/lib/utils.ts`, `components.json` | [docs/ui-system.md](docs/ui-system.md) |
| Utilities | IP math, debounce hook, and other shared helpers | `src/lib/ipMath.ts`, `src/lib/useDebounce.ts` | [docs/utilities.md](docs/utilities.md) |

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
