# Pointer: Football Support — Implementation Plan

## Decisions (PM sign-off)
- **Multi-sport**, not pivot. Baseball stays fully functional.
- **Single flat player type per sport** (`FootballPlayer` with all offensive stats).
- **Football roster positions**: QB, RB, WR, TE, Flex (RB/WR/TE), K, DST, Bench. MVP skips K/DST scoring; slots exist but scoring is zeroed.
- **Offensive-only scoring for MVP**: Pass Yds, Pass TD, INT, Rush Yds, Rush TD, Rec, Rec Yds, Rec TD, 2PT, Fum Lost.
- **Manual CSV upload only** for football projections. No public dataset endpoint in MVP.
- **Standard football CSV auto-detection**: `Pass Yds`, `Pass TD`, `Rush Yds`, `Rush TD`, `Rec`, `Rec Yds`, `Rec TD`, `Int`, `2PT`, `Fum Lost`.

## Architecture

### 1. Sport Discriminant
Add `type Sport = "baseball" | "football"` to `src/types/league.ts`.
- `League` gets a `sport: Sport` field.
- `createDefaultLeague("My League", { sport: "football" })` produces a football league.
- Existing leagues default to `"baseball"` (migration in `src/lib/persistence/index.ts`).

### 2. Football Domain Types (`src/types/football.ts`)
```ts
export type FootballPosition = "QB" | "RB" | "WR" | "TE";
export type FootballRosterSlot = FootballPosition | "Flex" | "K" | "DST" | "Bench";

export interface FootballPlayer {
  _type: "football-player";
  _id: string;
  Name: string;
  Team: string;
  Position: FootballPosition;
  // Passing
  PassYds: number;
  PassTD: number;
  Int: number;
  // Rushing
  RushYds: number;
  RushTD: number;
  // Receiving
  Rec: number;
  RecYds: number;
  RecTD: number;
  // Misc
  "2PT": number;
  FumLost: number;
  // Rate / display
  ADP: number | null;
}
```

### 3. Football Scoring Settings
```ts
export interface FootballScoringSettings {
  name: string;
  passing: {
    PassYds: number;  // per yard, usually 0.04
    PassTD: number;   // usually 4
    Int: number;      // usually -2
  };
  rushing: {
    RushYds: number; // per yard, usually 0.1
    RushTD: number;  // usually 6
  };
  receiving: {
    Rec: number;     // PPR point, usually 0/0.5/1
    RecYds: number;  // per yard, usually 0.1
    RecTD: number;   // usually 6
  };
  misc: {
    "2PT": number;   // usually 2
    FumLost: number; // usually -2
  };
}
```

### 4. Sport-Agnostic `ScoringSettings`
Change `League.scoringSettings` to a union:
```ts
export type ScoringSettings = BaseballScoringSettings | FootballScoringSettings;
```
All scoring consumers must narrow by `league.sport`.

### 5. Sport-Agnostic `Player` Union
```ts
export type Player = BatterPlayer | PitcherPlayer | TwoWayPlayer | FootballPlayer;
```
All player consumers must handle the new union member.

### 6. Football PAR
Simpler than baseball:
1. For each position (QB, RB, WR, TE), compute total roster slots across league.
2. Sort all `FootballPlayer`s by projected points descending.
3. For each position, find the Nth+1 player (where N = total slots for that position + Flex).
4. Replacement level for Flex = max(RB replacement, WR replacement, TE replacement).
5. PAR = projectedPoints - replacementLevelForBestEligiblePosition.

No SP/RP role-weighting needed.

### 7. Football CSV Parser (`src/lib/projections/footballParser.ts`)
- Auto-detect football by presence of `Pass Yds` / `Rush Yds` / `Rec` columns.
- Map columns to `FootballPlayer` fields.
- Produce `Player[]` (as `FootballPlayer`).
- Merge into projection group alongside baseball players? **Decision**: Separate projection groups per sport. A group already has `batters`, `pitchers`, `twoWayPlayers`. Add `footballPlayers: FootballPlayer[]`.

### 8. Settings UI
- `RosterSection`: Show football slots when `league.sport === "football"`.
- `ScoringSection`: Show football scoring inputs when `league.sport === "football"`.
- `LeaguesSection`: Add a "Sport" selector when creating a league.

### 9. Leaderboard
- `Leaderboard.tsx` already takes `viewMode: "all" | "batters" | "pitchers"`. Add `"football"`.
- Render football columns: Pass Yds, Pass TD, Rush Yds, Rush TD, Rec, Rec Yds, Rec TD, Proj Pts, PAR.
- Position filter pills: QB, RB, WR, TE, Flex.

### 10. Migration
- Zustand persist version bump from 8 → 9.
- `migrate.ts`: existing leagues get `sport: "baseball"` added.
- Existing scoring settings shaped as baseball.

## File Changes

### New files
- `src/types/football.ts`
- `src/lib/scoring/footballScoring.ts`
- `src/lib/leaderboard/footballPar.ts`
- `src/lib/projections/footballParser.ts`
- `src/lib/league/footballDefaults.ts`
- `qa/football.feature`

### Modified files
- `src/types/league.ts` — add `Sport`, union `ScoringSettings`
- `src/types/player.ts` — add `FootballPlayer` to union
- `src/types/projection.ts` — add `footballPlayers` to `ProjectionGroup`
- `src/types/draft.ts` — no change needed
- `src/types/index.ts` — export football types
- `src/lib/scoring/index.ts` — export football scoring
- `src/lib/scoring/batterScoring.ts` — rename? No, keep; add `baseball` prefix conceptually
- `src/lib/leaderboard/par.ts` — branch on player._type === "football-player"
- `src/lib/leaderboard/index.ts` — export football helpers
- `src/lib/projections/parser.ts` — detect football, delegate to footballParser
- `src/lib/projections/index.ts` — export football parser
- `src/lib/projections/publicDatasets.ts` — skip football for now
- `src/lib/league/index.ts` — sport-aware defaults, `createDefaultLeague` takes sport
- `src/lib/persistence/index.ts` — version 9 migration
- `src/store/index.ts` — `createDefaultLeague` with sport
- `src/components/settings/LeaguesSection.tsx` — sport selector
- `src/components/settings/RosterSection.tsx` — football roster UI
- `src/components/settings/ScoringSection.tsx` — football scoring UI
- `src/components/settings/constants.ts` — football constants
- `src/components/Leaderboard.tsx` — football columns + filters
- `src/components/Header.tsx` — maybe sport-aware label

## Risk Mitigation
- **Baseball regression**: All existing baseball logic paths must remain untouched. Add `if (league.sport === "baseball")` early returns where needed.
- **Type safety**: After adding `FootballPlayer` to `Player` union, every `switch (player._type)` or exhaustive check must handle it. `tsc --noEmit` is the gate.
- **CSV parser collision**: Football and baseball detection is mutually exclusive based on column names. If both match, football wins? No — prefer the more specific match. If `ERA` present → baseball. If `Pass Yds` present → football.

## QA Plan
- BDD feature: Create a football league, set scoring to half-PPR, upload a football CSV, verify leaderboard shows projected points.
- Regression BDD: Load a baseball league, verify it still works exactly as before.

## Dependency Graph
```
Types (football.ts, league.ts union) ─┬─> Scoring engine
                                      ├─> PAR
                                      ├─> CSV parser
                                      ├─> League factory
                                      └─> Store

League factory ──> Store ──> Settings UI ──> Leaderboard

All can be built once types are stable.
```
