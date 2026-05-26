# Pointer Football Support — Session Notes

## ✅ Done (this session)

1. **Typecheck is green (0 errors)** — fixed all 46 type errors across 11 files:
   - `types/league.ts` — removed duplicate `FootballScoringSettings`, imported from `football.ts`
   - `types/projection.ts` — fixed `FootballPlayer` import path
   - `types/index.ts` — resolved duplicate-export conflict
   - `lib/league/index.ts` — added `FootballScoringSettings` import
   - `lib/eligibility/format.ts` — added `football-player` guard
   - `lib/eligibility/import.ts` — filtered football players out of MLBAMID eligibility logic
   - `lib/leaderboard/sorting.ts` — wrapped batter `switch` in `_type === "batter"` guard
   - `lib/scoring/pitcherScoring.ts` — added `isBaseballScoringSettings` type guard
   - `app/(test)/leaderboard-visual/page.tsx` — added football roster slots + `footballPlayers: []`
   - `components/CsvUpload.tsx` — added `footballPlayers: []` to projection group
   - `lib/projections/publicDatasets.ts` — added `footballPlayers` to `SeedProjectionGroupInput`, made parsing lenient for backward compat
   - `components/Leaderboard.tsx` — wired `footballStatSet`, `sport` props to `ColumnsPicker`
   - `scripts/generate-public-dataset.ts` — added `footballPlayers: []`

2. **Lib tests green (204 pass / 0 fail)** — fixed 2 regressions in `publicDatasets.test.ts` caused by the `footballPlayers` field addition.

3. **Leaderboard football rendering**
   - Fixed "Type" column to show `OFF` for football players
   - Added 10 football stat columns (PassYds, PassTD, Int, RushYds, RushTD, Rec, RecYds, RecTD, 2PT, FumLost)
   - Wired `selectedFootballStats` state through to `LeaderboardTable` and column builder
   - `ColumnsPicker` already supports football "Offense" stat group toggle

4. **Football settings UI** — already built in previous session:
   - `FootballRosterSection.tsx`
   - `FootballScoringSection.tsx`
   - Conditionally rendered via `RosterSection.tsx` / `ScoringSection.tsx` based on `activeLeague.sport`

5. **Football scoring engine** — `src/lib/scoring/footballScoring.ts` exists and tested
6. **Football CSV parser** — `src/lib/projections/footballParser.ts` exists and tested

## ❌ Remaining

1. **UI test suite (77 failures)** — These are pre-existing Bun/jsdom environment issues (`document is not defined`), not caused by football changes. The lib tests (logic layer) are the only green suite right now.

2. **BDD smoke tests for multi-sport setup** — Need jsdom or Playwright environment to test component interactions.

3. **Codex architecture review** — User wants fresh eyes (GPT-5.5 xhigh) on the branch before merge.

4. **Polish: `PlayerViewFilter` / `PositionFilter`** — Still show baseball options ("Batters"/"Pitchers") even in football leagues. Not type-breaking, just UX confusion.

5. **Polish: `buildPlayerSearchText`** — Should include `Position` for football players to make position search work in leaderboard.

## Branch

`feat/football-support` on `/opt/data/pointer`

## How to verify

```bash
cd /opt/data/pointer
npx tsc --noEmit -p tsconfig.check.json   # 0 errors
/opt/bun/bin/bun test src/lib/            # 204 pass, 0 fail
```
