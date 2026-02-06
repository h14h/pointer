# Types

## Source Files
- `src/types/index.ts`

## Design Decisions

**Player discrimination.** `Player` is a union of `BatterPlayer`, `PitcherPlayer`, and `TwoWayPlayer`, discriminated by the `_type` field (`"batter"`, `"pitcher"`, `"two-way"`). All internal metadata fields are prefixed with `_` to distinguish them from CSV-sourced stat fields.

**TwoWayPlayer identifier lifting.** Two-way players lift shared identifiers (Name, Team, PlayerId, MLBAMID, ADP) to the top level and nest stats under `_battingStats` and `_pitchingStats` with identifiers omitted. This avoids ambiguity about which copy of a shared field is canonical.

**DraftState string keys.** `draftedByTeam` and `keeperByTeam` use `Record<string, string>` where the key is the player `_id` and the value is the stringified team index. This is a consequence of JSON serialization in localStorage — object keys must be strings. All consumers must `Number()` or `parseInt()` the values to get numeric team indices.

**Rate stats are display-only.** Stats like AVG, ERA, WHIP, OBP, and SLG exist on the player types but are not used in point calculations. They exist solely for display in the leaderboard. Point calculations use only counting stats.

**IdSource semantics.** `"MLBAMID"` and `"PlayerId"` mean the ID was read from a known column. `"custom"` means the user chose a CSV column. `"generated"` means no ID column was found and a synthetic `"{type}-{index}"` ID was created. Generated IDs prevent two-way player merging since they can't match across files.

**Position vs RosterSlot.** `Position` is the 9 fielding positions (C through DH). `RosterSlot` extends this with group slots (OF, CI, MI, IF, UTIL), pitcher slots (SP, RP, P), and special slots (IL, NA). Position is used for eligibility; RosterSlot is used for roster configuration.
