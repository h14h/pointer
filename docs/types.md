# Types

## Source Files
- `src/types/index.ts`

## Design Decisions

**Player discrimination.** `Player` is a union of `BatterPlayer`, `PitcherPlayer`, and `TwoWayPlayer`, discriminated by the `_type` field (`"batter"`, `"pitcher"`, `"two-way"`). All internal metadata fields are prefixed with `_` to distinguish them from CSV-sourced stat fields.

**TwoWayPlayer identifier lifting.** Two-way players lift shared identifiers (Name, Team, PlayerId, MLBAMID, ADP) to the top level and nest stats under `_battingStats` and `_pitchingStats` with identifiers omitted. This avoids ambiguity about which copy of a shared field is canonical.

**DraftState string keys.** `draftedByTeam` and `keeperByTeam` use `Record<string, string>` where the key is the player `_id` and the value is the stringified team index. This is a consequence of JSON serialization in localStorage — object keys must be strings. All consumers must `Number()` or `parseInt()` the values to get numeric team indices.

**Draft session model.** `DraftState` now models a live draft session rather than a manual active-team cursor. It stores `format`, `pickIndex`, `history`, and `keeperSlotByPlayer` so the current team, overall pick, and round context can be derived consistently anywhere in the UI.

**DraftPick history is manual picks only.** `DraftPick[]` tracks picks made through the live draft board, in order, for undo and pick-context display. Each pick also stores `slotIndex`, the zero-based snake-draft slot consumed by that pick, so undo can restore the correct position even when keeper reservations skip future slots.

**Keeper slot reservations are optional metadata.** `keeperSlotByPlayer` maps a keeper to the zero-based draft slot it consumes. Missing or `null` means the keeper is unscheduled (for example, legacy migrated data). Scheduled keeper slots must align with the owning team's natural snake position; traded-pick support is intentionally out of scope.

**Rate stats are display-only.** Stats like AVG, ERA, WHIP, OBP, and SLG exist on the player types but are not used in point calculations. They exist solely for display in the leaderboard. Point calculations use only counting stats.

**IdSource semantics.** `"MLBAMID"` and `"PlayerId"` mean the ID was read from a known column. `"custom"` means the user chose a CSV column. `"generated"` means no ID column was found and a synthetic `"{type}-{index}"` ID was created. Generated IDs prevent two-way player merging since they can't match across files.

**Position vs RosterSlot.** `Position` is the 9 fielding positions (C through DH). `RosterSlot` extends this with group slots (OF, CI, MI, IF, UTIL), pitcher slots (SP, RP, P), and special slots (IL, NA). Position is used for eligibility; RosterSlot is used for roster configuration.

**Weekly start limit is league-level metadata.** `LeagueSettings.weeklyStartLimit` is optional and independent from roster slots. It does not change point scoring directly; it exists so PAR can reduce effective SP demand and raise RP demand in capped-start leagues, using projected pitcher role shares from `GS`/`G` rather than SP/RP eligibility alone.

## Multi-League

**League type.** A `League` bundles everything that is per-league: `scoringSettings`, `leagueSettings`, and `draftState`. This allows users to maintain multiple league configurations (e.g., "ESPN H2H", "Home League") with separate settings and draft state, while sharing projection data across them.

**AppState structure.** The root `AppState` holds `leagues[]` and `activeLeagueId` rather than per-league data directly. All components that previously read `scoringSettings`/`leagueSettings`/`draftState` from the store now derive them from the active league.

**League ID generation.** IDs are generated via `crypto.randomUUID()` to ensure uniqueness across imports/exports.

**updatedAt timestamp.** Each `League` carries an `updatedAt` field (Unix ms) that updates whenever the league's settings or draft state change. This is used for display purposes in the leagues list.

## RankedPlayer

`RankedPlayer` extends a `Player` with calculated fields for display in the leaderboard:

- `projectedPoints` — computed from `ScoringSettings` weights and counting stats
- `par` — Points Above Replacement, computed from `projectedPoints` minus the replacement level for the player's best eligible slot

See [Replacement Value (PAR)](paring-value.md) for full PAR calculation details.
