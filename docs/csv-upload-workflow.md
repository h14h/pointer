# CSV Upload Workflow

## Purpose
Three-stage modal wizard for uploading CSV/TSV projection files, selecting player ID sources, previewing parsed data, and optionally importing position eligibility from the MLB Stats API. Handles drag-and-drop, auto-detection of player type, two-way player merging, and progress tracking during eligibility import.

## Source Files
- `src/components/CsvUpload.tsx`

## Dependencies
- `react` -- `useState`, `useCallback`
- `@/lib/csvParser` -- `parsePlayerCSV`, `mergePlayers`, `ParseResult`, `IdConfig` ([CSV parsing spec](./csv-parsing.md))
- `@/lib/eligibility` -- `computeHitterEligibility`, `computePitcherEligibility`, `emptyPositionGames`, `eligibilityFromProfilePosition`, `mergeTwoWayEligibility`, `mergeWarnings` ([eligibility spec](./eligibility.md))
- `@/lib/mlbStatsApi` -- `fetchSeasonStatsForPlayers` ([MLB Stats API spec](./mlb-stats-api.md))
- `@/store` -- `useStore` ([state spec](./state.md))
- `@/types` -- `TwoWayPlayer`, `IdSource`, `ProjectionGroup`, `Player`, `Eligibility` ([types spec](./types.md))

## Props
```ts
interface CsvUploadProps {
  isOpen: boolean;
  onClose: () => void;
}
```

## State
| Variable | Type | Purpose |
|---|---|---|
| `dragActive` | `boolean` | Whether a file is being dragged over the drop zone |
| `uploadType` | `"auto" \| "batter" \| "pitcher"` | Force player type detection or use auto-detect |
| `groupName` | `string` | Name for the new projection group |
| `groupNameTouched` | `boolean` | Whether the user has manually edited the group name |
| `batterFile` | `UploadFileState \| null` | Parsed batter file state |
| `pitcherFile` | `UploadFileState \| null` | Parsed pitcher file state |
| `error` | `string \| null` | Error message displayed at the top of the modal |
| `importEligibilityEnabled` | `boolean` | Toggle for MLB Stats eligibility import |
| `isImportingEligibility` | `boolean` | Whether an eligibility import is in progress |
| `importProgress` | `number` | 0-100 percentage of eligibility import completion |
| `importPlayer` | `string` | Name of the player currently being processed during import |
| `importError` | `string \| null` | Error message from eligibility import failure |
| `retryStatus` | `string \| null` | Display string for retry attempts (e.g., "Retry 2 in 1.0s (status 429)") |
| `importTargetGroup` | `ProjectionGroup \| null` | The group being enriched with eligibility data |

### UploadFileState
```ts
type UploadFileState = {
  file: File;
  content: string;
  parseResult: ParseResult;
  selectedIdSource: IdSource | "custom";
  customIdColumn: string;
};
```

## Store Bindings
**Read:** `projectionGroups` (used for `.length` to suggest default group name)

**Write:** `addProjectionGroup`, `applyEligibilityForGroup`

## Key Computations

| Name | Description |
|---|---|
| `handleFiles` | `useCallback` -- async handler: reads files via `Promise.all`, calls `parsePlayerCSV` on each, validates at most one batter and one pitcher file, auto-suggests group name from first file name if user has not touched it |
| `needsIdSelection` | Derived boolean -- `true` when either file's `parseResult.needsIdSelection` is `true` (no MLBAMID or PlayerId column found) |
| `handleIdSelection` | `useCallback` -- re-parses files with the selected `IdConfig` (generated or custom column) |
| `runEligibilityImport` | `useCallback` -- async: fetches season stats via `fetchSeasonStatsForPlayers`, iterates all players, computes eligibility per player type (hitter/pitcher/two-way with merged eligibility), updates progress, calls `applyEligibilityForGroup` |
| `missingTypeWarning` | Derived string -- warning text when only one file type (batter or pitcher) was uploaded |
| `handleConfirm` | Validates group name and files, merges two-way players via `mergePlayers` if both types present, builds `ProjectionGroup`, calls `addProjectionGroup`, optionally runs eligibility import |
| `handleRetryImport` | Re-runs `runEligibilityImport` on the `importTargetGroup` after a failure |
| `resetState` | Clears all local state back to defaults |

## Event Handlers

| Interaction | Handler | Behavior |
|---|---|---|
| Drag over drop zone | `onDragOver` | `preventDefault`, sets `dragActive` to true |
| Drag leave drop zone | `onDragLeave` | Sets `dragActive` to false |
| Drop files | `onDrop` via `handleDrop` | Calls `handleFiles` with dropped files |
| Browse button / file input | `onChange` via `handleChange` | Calls `handleFiles` with selected files |
| Player type select | `onChange` on select | Sets `uploadType` |
| ID source select (per file) | `onChange` on select | Updates `selectedIdSource` on the respective file state |
| Custom column select (per file) | `onChange` on select | Updates `customIdColumn` on the respective file state |
| Continue button (ID selection stage) | `onClick` | Calls `handleIdSelection` to re-parse with selected ID config |
| Group name input | `onChange` | Sets `groupName` and marks `groupNameTouched` as true |
| Eligibility import toggle | `onChange` on checkbox | Sets `importEligibilityEnabled` |
| Back button (preview stage) | `onClick` | Clears `batterFile`, `pitcherFile`, and `error` to return to upload stage |
| Import Group button | `onClick` via `handleConfirm` | Validates and creates projection group, optionally runs eligibility import |
| Retry Import button | `onClick` | Calls `handleRetryImport` |
| Cancel / close button | `onClick` via `handleCancel` | Resets state and calls `onClose`; disabled during import |

## Layout

### Stage 1: File Upload
Shown when `!batterFile && !pitcherFile`:
1. Player type select (Auto-detect / Batters / Pitchers)
2. Drag-and-drop zone with emerald highlight when `dragActive`, "Browse Files" label wrapping a hidden file input (accepts `.csv`, `.tsv`, `.txt`, multiple files)
3. Cancel button

### Stage 2: ID Selection (conditional)
Shown when `needsIdSelection` is true:
1. Warning banner explaining no MLBAMID or PlayerId found
2. Per-file section (batter and/or pitcher):
   - File name display
   - ID source select (Generate IDs automatically / Use a column from the file)
   - Custom column select (conditional, when source is "custom") -- options populated from `parseResult.availableColumns`
3. Cancel and Continue buttons

### Stage 3: Preview & Import
Shown when files are parsed and IDs resolved:
1. Group name text input
2. Eligibility import toggle card with description and switch
3. Missing type warning (conditional, amber banner)
4. Preview tables (one per file type):
   - Row count and type label
   - Parse warnings (up to 5, with overflow count)
   - Preview table showing first 5 players with Name, Team, and 3 representative stats (HR/R/RBI for batters, W/SO/ERA for pitchers)
5. Import progress section (conditional, during import or after error):
   - Progress bar with percentage and current player name
   - Retry status message during exponential backoff
   - Error message with Retry Import button after failure
6. Back button and Import Group button (label changes based on eligibility toggle and import state)

## Performance

| Technique | Where | Purpose |
|---|---|---|
| `useCallback` | `handleFiles`, `handleDrop`, `handleChange`, `handleIdSelection`, `runEligibilityImport` | Stable references, prevents unnecessary re-renders |
| `Promise.all` | File reading | Reads multiple files in parallel |
| `requestAnimationFrame` | Every 25 players during eligibility import | Yields to the main thread to keep progress bar responsive |
| Early returns | `handleFiles`, `handleConfirm` | Validation short-circuits prevent unnecessary work |

## Edge Cases

| Condition | Behavior |
|---|---|
| `!isOpen` | Returns `null` (no rendering) |
| Drag-and-drop active | Drop zone border and background change to emerald |
| Multiple batter or pitcher files | Error: "Only one batter/pitcher file is allowed per upload" |
| Group name empty on confirm | Error: "Group name is required" |
| No files uploaded on confirm | Error: "Please upload at least one CSV file" |
| Parse errors present | Displayed as amber warnings in preview, capped at 5 with overflow count |
| Only one file type uploaded | Amber warning: "This group is missing one file type and will be partial" |
| Import in progress | Cancel/Back/Import buttons disabled with `disabled:cursor-not-allowed disabled:opacity-60`; close button also disabled |
| Import failure | Error message displayed with Retry Import button; group was already added to store |
| Retry with exponential backoff | `retryStatus` displays attempt number, delay, and HTTP status |
| Empty player list during import | Progress set to 100%, `applyEligibilityForGroup` called with empty map |
| Missing MLBAMID on a player | Warning added; falls back to profile position via `eligibilityFromProfilePosition` |
| Two-way player eligibility | Computes batting and pitching eligibility separately, then merges via `mergeTwoWayEligibility` with combined warnings |
| Auto group name suggestion | Uses first file name (extension stripped); falls back to "Methodology N+1" |
