# How Pointer Works

This document maps the codebase into domains, each with a dedicated spec in `docs/`. See [WHY.md](WHY.md) for project purpose and values, and [README.md](README.md) for quick start.

Each spec is the authoritative reference for its domain. When code changes, the relevant spec should be updated to match.

## Domain Map

| Domain | Description | Source Files | Spec |
|--------|-------------|-------------|------|
| Types & Schemas | Core data structures used across the app | `src/types/index.ts` | [docs/types.md](docs/types.md) |
| CSV Parsing | Upload, detect, and normalize player data from CSV/TSV files | `src/lib/csvParser.ts` | [docs/csv-parsing.md](docs/csv-parsing.md) |
| Scoring | Point calculation, scoring presets, and league-specific weight application | `src/lib/calculatePoints.ts`, `src/lib/presets.ts` | [docs/scoring.md](docs/scoring.md) |
| Pitching Outcomes | Regression estimators for QS/CG/ShO used when import-time estimation is explicitly selected | `src/lib/pitchingOutcomes.ts`, `src/lib/qualityStarts.ts`, `src/lib/pitchingOutcomeImport.ts` | [docs/pitching-outcomes.md](docs/pitching-outcomes.md) |
| Eligibility | Position eligibility computation and pitcher role classification | `src/lib/eligibility.ts` | [docs/eligibility.md](docs/eligibility.md) |
| MLB Stats API | Fetching real-time stats from MLB's public API for eligibility enrichment | `src/lib/mlbStatsApi.ts` | [docs/mlb-stats-api.md](docs/mlb-stats-api.md) |
| State Management | Zustand store, persistence, and schema migrations | `src/store/index.ts` | [docs/state.md](docs/state.md) |
| Leaderboard | Player ranking table with sorting, filtering, and draft interactions | `src/components/Leaderboard.tsx` | [docs/leaderboard.md](docs/leaderboard.md) |
| CSV Upload Workflow | Upload modal, file handling, eligibility import, and optional pitching-outcome estimation | `src/components/CsvUpload.tsx` | [docs/csv-upload-workflow.md](docs/csv-upload-workflow.md) |
| Settings Page | Dedicated settings route with sectioned Scoring, Roster, and Draft controls | `src/app/settings/page.tsx`, `src/components/settings/*.tsx` | [docs/settings-page.md](docs/settings-page.md) |
| Header | Top navigation, draft controls, and team selection | `src/components/Header.tsx` | [docs/header.md](docs/header.md) |
| Utilities | IP math, debounce hook, and other shared helpers | `src/lib/ipMath.ts`, `src/lib/useDebounce.ts` | [docs/utilities.md](docs/utilities.md) |

## Cross-Cutting Concerns

Some features span multiple domains. Start with the linked spec and follow its dependency references.

- **Two-way players** — Handled across CSV parsing, scoring, eligibility, and state. Start with [docs/types.md](docs/types.md).
- **Draft mode** — Spans state management, leaderboard, and header. Start with [docs/state.md](docs/state.md).
- **Persistence & migrations** — Covered in [docs/state.md](docs/state.md).

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

When updating a spec after a code change, ask: *"Would an agent need to know this to work effectively, or could it just read the code?"* If the answer is the latter, leave it out.

## Maintenance

This document and its specs should always reflect the current codebase. When code changes, update the relevant spec. If a domain is added or removed, update this table.
