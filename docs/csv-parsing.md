# CSV Parsing

## Purpose

Parses CSV and TSV projection files into typed Player objects. Handles delimiter detection, player type detection, ID source resolution, and merging of two-way players from separate batter/pitcher files.

## Source Files

- `src/lib/csvParser.ts`

## Dependencies

- [Types](types.md) — `Player`, `BatterPlayer`, `PitcherPlayer`, `TwoWayPlayer`, `BatterStats`, `PitcherStats`, `IdSource`
- PapaParse (external) — CSV/TSV parsing

## Dependents

- [CSV Upload Workflow](csv-upload-workflow.md) — uses `parsePlayerCSV`, `mergePlayers`, `extractBattingStats`, `extractPitchingStats`

## Types

### `IdConfig`

```typescript
{
  source: IdSource;       // Which column to use for player IDs
  customColumn?: string;  // Column name when source is "custom"
}
```

### `ParseResult`

```typescript
{
  players: Player[];              // Parsed player objects (empty if needsIdSelection)
  type: "batter" | "pitcher";    // Detected player type
  rowCount: number;               // Number of data rows in the CSV
  errors: string[];               // Per-row parse errors
  idSource: IdSource;             // Resolved ID source
  availableColumns: string[];     // All column headers found in the CSV
  needsIdSelection: boolean;      // True if no known ID column was detected
}
```

## API Reference

### `parsePlayerCSV(content: string, forceType?: "batter" | "pitcher", idConfig?: IdConfig): ParseResult`

Main entry point for CSV parsing. Detects delimiter (tab vs comma), player type (batter vs pitcher), and ID source. Parses each row into a typed Player object.

**Parameters:**
- `content` — Raw CSV/TSV string content.
- `forceType` — Optional override for player type detection.
- `idConfig` — Optional ID configuration. If omitted, auto-detected from headers.

**Returns:** A `ParseResult` object.

**Behavior:**
1. Detects delimiter via `detectDelimiter` (tab vs comma by first-line character counts).
2. Detects player type from headers (batter columns: PA, AB, SB, AVG, OBP, SLG vs pitcher columns: ERA, WHIP, IP, GS, SV, QS). Respects `forceType` if provided.
3. Detects ID source from headers (MLBAMID > PlayerId > needs selection). Respects `idConfig` if provided.
4. If no `idConfig` and detection yields `needsIdSelection: true`, returns early with `needsIdSelection: true` and an empty `players` array.
5. Filters out rows with empty Name.
6. Wraps each row parse in try/catch — errors are collected in `errors` array.

### `parseBatterRow(row: Record<string, string>, index: number, idConfig: IdConfig): Player`

Parses a single CSV row into a `BatterPlayer`.

**Parameters:**
- `row` — Key-value map of column name to cell value.
- `index` — Row index (used for fallback ID generation).
- `idConfig` — ID source configuration.

**Returns:** A `BatterPlayer` object.

**Behavior:**
- Case-insensitive column lookup for Name and Team (`row.Name || row.name`, `row.Team || row.team`).
- Numeric stat fields parsed via `parseNumber` (empty/invalid becomes 0).
- ADP parsed via `parseNullableNumber` (empty/invalid becomes `null`).
- Player ID resolved via `resolvePlayerId`.

### `parsePitcherRow(row: Record<string, string>, index: number, idConfig: IdConfig): Player`

Parses a single CSV row into a `PitcherPlayer`. Same pattern as `parseBatterRow` but maps to pitcher stat fields.

### `extractBattingStats(batter: BatterPlayer): TwoWayPlayer["_battingStats"]`

Strips identifier fields (Name, Team, PlayerId, MLBAMID, ADP) from a `BatterPlayer`, returning only the batting stat fields suitable for embedding in a `TwoWayPlayer`.

### `extractPitchingStats(pitcher: PitcherPlayer): TwoWayPlayer["_pitchingStats"]`

Same as `extractBattingStats` but for pitcher stats.

### `mergePlayers(newPlayers: Player[], existingPlayers: Player[], newType: "batter" | "pitcher"): { merged: Player[]; remaining: Player[] }`

Merges batter and pitcher data into `TwoWayPlayer` entries when they share the same `_id`.

**Parameters:**
- `newPlayers` — Newly parsed players to merge in.
- `existingPlayers` — Previously loaded players to match against.
- `newType` — The type of the new players (`"batter"` or `"pitcher"`).

**Returns:**
- `merged` — Array of `TwoWayPlayer` objects created from matched pairs.
- `remaining` — Array of new players that did not match any existing player.

**Behavior:**
- Creates a `TwoWayPlayer` when a batter and pitcher share the same `_id`.
- Removes matched players from the existing array (side effect).
- Unmatched new players are returned in `remaining`.

## Internal Functions

### `parseNumber(value: string | undefined): number`

Parses a string to a number. Returns 0 for empty strings, undefined, or non-numeric values.

### `parseNullableNumber(value: string | undefined): number | null`

Parses a string to a number. Returns `null` for empty strings, undefined, or non-numeric values.

### `detectDelimiter(content: string): string`

Detects whether the file uses tabs or commas as delimiters by counting occurrences of each character in the first line.

### `detectPlayerType(headers: string[]): "batter" | "pitcher"`

Determines player type by checking headers against known batter columns (PA, AB, SB, AVG, OBP, SLG) and pitcher columns (ERA, WHIP, IP, GS, SV, QS). Returns the type with the most column matches.

### `resolvePlayerId(row: Record<string, string>, index: number, type: string, idConfig: IdConfig): string`

Resolves a player's unique ID using a fallback chain:
1. MLBAMID column (if `idConfig.source` is `"mlbam"`)
2. PlayerId column (if `idConfig.source` is `"fangraphs"`)
3. Custom column (if `idConfig.source` is `"custom"`)
4. Generated fallback: `"{type}-{index}"`

### `detectIdSource(headers: string[]): { source: IdSource; needsSelection: boolean }`

Case-insensitive header check for known ID columns. Priority: MLBAMID > PlayerId. If neither found, returns `needsSelection: true`.

## Edge Cases

- **Delimiter detection:** Based on first-line character counts — a file with more tabs than commas in line 1 is treated as TSV.
- **Case-insensitive column lookup:** Handles `Name`/`name`, `Team`/`team`, `MLBAMID`/`mlbamid`, `PlayerId`/`playerid`.
- **Empty Name rows:** Silently filtered out (no error generated).
- **`needsIdSelection` early return:** When no known ID column is detected and no `idConfig` is provided, returns immediately with an empty `players` array and `needsIdSelection: true`. The caller must prompt the user to select an ID column.
- **ID fallback:** If the configured column lookup fails for a row, falls back to `"{type}-{index}"`.
- **Per-row error isolation:** Each row is parsed in a try/catch so one malformed row does not abort the entire file.
