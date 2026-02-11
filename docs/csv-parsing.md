# CSV Parsing

## Source Files
- `src/lib/csvParser.ts`

## Dependencies
- [Types](types.md) — Player variants, stat interfaces, `IdSource`
- PapaParse (external) — CSV/TSV parsing engine

## Dependents
- [CSV Upload Workflow](csv-upload-workflow.md) — uses `parsePlayerCSV`, `mergePlayers`

## How Parsing Works

**Delimiter detection.** The first line is scanned for tab vs comma character counts. More tabs → TSV; more commas → CSV. This means a file with a single tab character on line 1 and no commas will be treated as TSV.

**Player type detection.** Headers are matched against known batter columns (PA, AB, SB, AVG, OBP, SLG) and pitcher columns (ERA, WHIP, IP, GS, SV, QS). The type with more matches wins. An explicit `forceType` parameter overrides detection.

**ID source resolution.** Headers are checked case-insensitively for `MLBAMID` (preferred) then `PlayerId`. If neither is found and no `idConfig` is provided, parsing returns early with `needsIdSelection: true` and an **empty players array**. The caller must prompt the user to choose an ID column before re-parsing. This early return is important — it means the first parse of a file without known ID columns produces no players.

**Column lookup is case-insensitive** for Name and Team (`row.Name || row.name`). Stat columns are matched by their exact key names from PapaParse's header row.

**Empty Name rows are silently filtered out** — no error is generated.

**Per-row error isolation.** Each row is parsed in a try/catch. One malformed row does not abort the file — its error is collected and reported to the user.

**Pitching-outcome coverage metadata.** Pitcher parses include `missingPitchingOutcomes` metadata for `QS`, `CG`, and `ShO`, keyed by player ID. Upload UI uses this to offer opt-in estimation only for rows that were actually missing.

## Two-Way Player Merging

`mergePlayers` matches players across batter and pitcher files by `_id`. When a match is found, it creates a `TwoWayPlayer` with identifiers lifted to the top level and stats nested. **This only works when both files use real ID columns** (MLBAMID or PlayerId). Generated IDs (`"batter-0"`, `"pitcher-0"`) will never match.

The function mutates the existing array as a side effect — matched players are removed from it. Unmatched new players are returned in `remaining`.

## Edge Cases
- Generated ID fallback format: `"{type}-{index}"` — used when the configured column lookup fails for a row.
- ADP is parsed as nullable — empty/invalid values become `null`, not `0`.
- All other numeric stats default to `0` on parse failure.
