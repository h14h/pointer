# Public Datasets

## Source Files
- `src/lib/projections/publicDatasets.ts`
- `src/server/publicDatasets/storage.ts`
- `src/app/api/public-datasets/route.ts`
- `src/app/api/public-datasets/[slug]/route.ts`
- `src/components/PublicDatasetBootstrap.tsx`
- `scripts/publish-public-dataset.ts`
- `data/public-datasets/*`

## Dependencies
- [Types](types.md) — `ProjectionGroup` and provenance metadata
- [State](state.md) — protected baseline persistence and seeding behavior
- AWS SDK S3 client (external) — server-only access to Fly.io Tigris

## Dependents
- [Leaderboard](leaderboard.md) — page-level bootstrap loading and retry UI
- [Header](header.md) — destructive copy and built-in dataset naming in the global selector
- [Settings Page](settings-page.md) — projection management and retroactive eligibility import for the built-in baseline

## Catalog Model

Public datasets are modeled as a catalog even though production currently ships a single entry. Storage always uses:

- `public-datasets/manifest.json`
- `public-datasets/{slug}.json`

The manifest is lightweight metadata for discovery. Each dataset object contains a fully normalized payload that can be turned into an app-ready `ProjectionGroup` without running the CSV parser.

## Tigris Boundary

The browser never talks to Tigris directly. All storage access happens through Next.js route handlers backed by the server-only storage module. This keeps Fly/Tigris credentials out of the client bundle and creates one narrow read-only interface for the app:

- `GET /api/public-datasets`
- `GET /api/public-datasets/[slug]`

Local development falls back to locally generated `data/public-datasets/` files when Tigris env vars are absent. Dataset payloads are gitignored — only `manifest.json` is committed. Run `scripts/generate-public-dataset.ts` to create local dataset files for development. Production always reads from Tigris.

## Protected Baseline Semantics

When the default public dataset is seeded locally, it becomes a normal `ProjectionGroup` for scoring, ranking, and draft workflows, but its `source.kind` marks it as a protected public baseline.

That provenance drives three invariants:

- the built-in dataset cannot be removed through normal projection-management actions
- destructive clears remove uploads/custom groups but leave the baseline intact
- the active projection fallback prefers the protected baseline whenever the last custom group disappears
- the built-in dataset can still participate in retroactive eligibility import from Settings > Projections

This keeps a universal starting point available without introducing a separate leaderboard code path.

## Bootstrap Flow

`PublicDatasetBootstrap` waits until Zustand persistence has hydrated, then checks for any existing protected public group in local state.

- If one exists, it does nothing.
- If none exists, it fetches the manifest, selects the default dataset, fetches that dataset payload, converts it into a protected `ProjectionGroup`, and seeds it into the store.
- After the built-in group is available, it automatically runs the shared eligibility importer for that season once and persists the result locally.
- If a previously seeded built-in group predates auto-import and still lacks eligibility metadata, bootstrap backfills that import on the next visit.
- If the request fails, it renders a retryable banner above the leaderboard instead of blocking the rest of the app.

After the seed succeeds once, all subsequent visits can use the locally persisted dataset offline.

## Publish Workflow

Annual public datasets are prepared as normalized JSON files under `data/public-datasets/`. The publish script validates that:

- every dataset file parses successfully
- manifest slugs match dataset filenames/payloads
- manifest metadata matches each dataset payload
- exactly one dataset is marked as the default

The script then uploads each dataset object and finally uploads `manifest.json`, making the catalog update atomic enough for this simple immutable-dataset workflow.

## Local Generation

The dataset payload is generated locally from raw FanGraphs exports with `scripts/generate-public-dataset.ts`. The script is parameterized; it does not hardcode source file locations. Pass explicit batter/pitcher paths plus the catalog metadata you want to write:

```bash
bun run generate:public-dataset -- \
  --batters /path/to/fangraphs-batters.csv \
  --pitchers /path/to/fangraphs-pitchers.csv \
  --slug historical-2025 \
  --season 2025 \
  --dataset-name "2025 Prior-Year Baseline" \
  --group-name "2025 Prior-Year Stats" \
  --default
```

This writes `data/public-datasets/{slug}.json` and upserts the matching manifest entry.

## Environment

Use `.env.local` for Tigris credentials when publishing. `.env.local.example` documents the required variables, and both dataset scripts load the Next.js local env file automatically so `bun run publish:public-datasets` works without manually exporting each variable in your shell.
