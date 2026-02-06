# Types & Schemas

## Purpose

Core data structures shared across all domains. This is the foundational type system — every other module imports from here.

## Source Files

- `src/types/index.ts`

## Dependencies

None.

## Dependents

All other domains.

## Interfaces

### `BatterStats`

Player batting statistics from CSV upload.

| Property | Type | Description |
|----------|------|-------------|
| `Name` | `string` | Player name |
| `Team` | `string` | Team abbreviation |
| `PlayerId` | `string` | FanGraphs player ID |
| `MLBAMID` | `string` | MLB Advanced Media ID |
| `G` | `number` | Games |
| `PA` | `number` | Plate appearances |
| `AB` | `number` | At bats |
| `H` | `number` | Hits |
| `"1B"` | `number` | Singles |
| `"2B"` | `number` | Doubles |
| `"3B"` | `number` | Triples |
| `HR` | `number` | Home runs |
| `R` | `number` | Runs |
| `RBI` | `number` | Runs batted in |
| `BB` | `number` | Walks |
| `IBB` | `number` | Intentional walks |
| `SO` | `number` | Strikeouts |
| `HBP` | `number` | Hit by pitch |
| `SF` | `number` | Sacrifice flies |
| `SH` | `number` | Sacrifice hits |
| `GDP` | `number` | Grounded into double plays |
| `SB` | `number` | Stolen bases |
| `CS` | `number` | Caught stealing |
| `AVG` | `number` | Batting average (rate stat, display only) |
| `OBP` | `number` | On-base percentage (rate stat, display only) |
| `SLG` | `number` | Slugging percentage (rate stat, display only) |
| `OPS` | `number` | On-base plus slugging (rate stat, display only) |
| `ISO` | `number` | Isolated power (rate stat, display only) |
| `BABIP` | `number` | Batting average on balls in play (rate stat, display only) |
| `"wRC+"` | `number` | Weighted runs created plus (rate stat, display only) |
| `WAR` | `number` | Wins above replacement (rate stat, display only) |
| `ADP` | `number \| null` | Average draft position |

### `PitcherStats`

Player pitching statistics from CSV upload.

| Property | Type | Description |
|----------|------|-------------|
| `Name` | `string` | Player name |
| `Team` | `string` | Team abbreviation |
| `PlayerId` | `string` | FanGraphs player ID |
| `MLBAMID` | `string` | MLB Advanced Media ID |
| `W` | `number` | Wins |
| `L` | `number` | Losses |
| `QS` | `number` | Quality starts |
| `CG` | `number` | Complete games |
| `ShO` | `number` | Shutouts |
| `G` | `number` | Games |
| `GS` | `number` | Games started |
| `SV` | `number` | Saves |
| `HLD` | `number` | Holds |
| `BS` | `number` | Blown saves |
| `IP` | `number` | Innings pitched |
| `H` | `number` | Hits allowed |
| `R` | `number` | Runs allowed |
| `ER` | `number` | Earned runs allowed |
| `HR` | `number` | Home runs allowed |
| `BB` | `number` | Walks allowed |
| `IBB` | `number` | Intentional walks allowed |
| `HBP` | `number` | Hit batters |
| `SO` | `number` | Strikeouts |
| `ERA` | `number` | Earned run average (rate stat, display only) |
| `WHIP` | `number` | Walks plus hits per inning (rate stat, display only) |
| `"K/9"` | `number` | Strikeouts per 9 innings (rate stat, display only) |
| `"BB/9"` | `number` | Walks per 9 innings (rate stat, display only) |
| `FIP` | `number` | Fielding independent pitching (rate stat, display only) |
| `WAR` | `number` | Wins above replacement (rate stat, display only) |
| `ADP` | `number \| null` | Average draft position |

### `ScoringSettings`

League scoring configuration defining point values per stat.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Name of the scoring system |
| `batting.R` | `number` | Runs |
| `batting.H` | `number` | Hits (if scoring all hits, not by type) |
| `batting."1B"` | `number` | Singles |
| `batting."2B"` | `number` | Doubles |
| `batting."3B"` | `number` | Triples |
| `batting.HR` | `number` | Home runs |
| `batting.RBI` | `number` | RBI |
| `batting.SB` | `number` | Stolen bases |
| `batting.CS` | `number` | Caught stealing (usually negative) |
| `batting.BB` | `number` | Walks |
| `batting.SO` | `number` | Strikeouts (usually negative) |
| `batting.HBP` | `number` | Hit by pitch |
| `batting.SF` | `number` | Sacrifice flies |
| `batting.GDP` | `number` | Grounded into double play (usually negative) |
| `pitching.IP` | `number` | Innings pitched |
| `pitching.W` | `number` | Wins |
| `pitching.L` | `number` | Losses (usually negative) |
| `pitching.QS` | `number` | Quality starts |
| `pitching.CG` | `number` | Complete games |
| `pitching.ShO` | `number` | Shutouts |
| `pitching.SV` | `number` | Saves |
| `pitching.BS` | `number` | Blown saves (usually negative) |
| `pitching.HLD` | `number` | Holds |
| `pitching.SO` | `number` | Strikeouts |
| `pitching.H` | `number` | Hits allowed (usually negative) |
| `pitching.ER` | `number` | Earned runs (usually negative) |
| `pitching.HR` | `number` | HR allowed (usually negative) |
| `pitching.BB` | `number` | Walks allowed (usually negative) |
| `pitching.HBP` | `number` | Hit batters (usually negative) |

### `DraftState`

| Property | Type | Description |
|----------|------|-------------|
| `draftedByTeam` | `Record<string, string>` | Map of stringified team index → drafted player ID |
| `keeperByTeam` | `Record<string, string>` | Map of stringified team index → keeper player ID |
| `activeTeamIndex` | `number` | Index of the team currently drafting |

### `RosterSettings`

| Property | Type | Description |
|----------|------|-------------|
| `positions` | `Record<RosterSlot, number>` | Number of slots per position type |
| `bench` | `number` | Number of bench slots |

### `LeagueSettings`

| Property | Type | Description |
|----------|------|-------------|
| `leagueSize` | `number` | Number of teams (clamped 2–20 by store) |
| `teamNames` | `string[]` | Team names, length matches `leagueSize` |
| `roster` | `RosterSettings` | Roster configuration |

### `RankedPlayer`

Player with calculated projected points, used for display and ranking.

| Property | Type | Description |
|----------|------|-------------|
| `player` | `Player` | The player object |
| `projectedPoints` | `number` | Calculated projected points |
| `isDrafted` | `boolean` | Whether player has been drafted |
| `isKeeper` | `boolean` | Whether player is a keeper |
| `draftedTeamIndex` | `number \| undefined` | Index of drafting team |
| `keeperTeamIndex` | `number \| undefined` | Index of keeping team |

### `AppState`

Top-level application state shape.

| Property | Type | Description |
|----------|------|-------------|
| `projectionGroups` | `ProjectionGroup[]` | All loaded projection sets |
| `activeProjectionGroupId` | `string \| null` | Currently selected group |
| `scoringSettings` | `ScoringSettings` | Current scoring configuration |
| `leagueSettings` | `LeagueSettings` | Current league configuration |
| `draftState` | `DraftState` | Current draft state |
| `isDraftMode` | `boolean` | Whether draft mode is active |

## Type Aliases

### `BatterPlayer`

```typescript
BatterStats & { _type: "batter"; _id: string; eligibility?: Eligibility }
```

Batter with metadata. Discriminated by `_type: "batter"`.

### `PitcherPlayer`

```typescript
PitcherStats & { _type: "pitcher"; _id: string; eligibility?: Eligibility }
```

Pitcher with metadata. Discriminated by `_type: "pitcher"`.

### `TwoWayPlayer`

```typescript
{
  _type: "two-way";
  _id: string;
  Name: string;
  Team: string;
  PlayerId: string;
  MLBAMID: string;
  ADP: number | null;
  _battingStats: Omit<BatterStats, "Name" | "Team" | "PlayerId" | "MLBAMID" | "ADP">;
  _pitchingStats: Omit<PitcherStats, "Name" | "Team" | "PlayerId" | "MLBAMID" | "ADP">;
  eligibility?: Eligibility;
}
```

Player with both batting and pitching stats. Identifiers are lifted to the top level; stats are nested under `_battingStats` and `_pitchingStats` with identifiers omitted.

### `Player`

```typescript
BatterPlayer | PitcherPlayer | TwoWayPlayer
```

Discriminated union. Use `player._type` to narrow.

### `IdSource`

```typescript
"MLBAMID" | "PlayerId" | "custom" | "generated"
```

Source of a player's primary ID. `"custom"` means a user-selected CSV column. `"generated"` means a synthetic ID was created (no ID column found).

### `Position`

```typescript
"C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF" | "DH"
```

Specific fielding positions (9 total).

### `RosterSlot`

```typescript
Position | "OF" | "UTIL" | "SP" | "RP" | "P" | "CI" | "MI" | "IF" | "IL" | "NA"
```

All possible roster slot types. Extends `Position` with group slots (OF, IF, CI, MI, UTIL), pitcher slots (SP, RP, P), and special slots (IL, NA).

### `Eligibility`

```typescript
{
  positionGames: Record<Position, number>;
  eligiblePositions: Position[];
  isSP: boolean;
  isRP: boolean;
  sourceSeason: number;
  updatedAt: string;
  warnings?: string[];
}
```

Position eligibility data for a player. `positionGames` tracks games played at each position. `eligiblePositions` lists positions the player qualifies for. `isSP`/`isRP` indicate pitcher role eligibility.

### `ProjectionGroup`

```typescript
{
  id: string;
  name: string;
  createdAt: string;
  batters: Player[];
  pitchers: Player[];
  twoWayPlayers: TwoWayPlayer[];
  batterIdSource: IdSource | null;
  pitcherIdSource: IdSource | null;
  eligibilityImportedAt?: string;
  eligibilitySeason?: number;
}
```

A named collection of player projections from a single upload session. Contains separate arrays for batters, pitchers, and two-way players. Tracks which ID source was used for each file and whether eligibility data has been imported.
