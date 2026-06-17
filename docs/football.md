# Football

Fantasy football support, added alongside baseball via a `sport` discriminator
on `League` and `ProjectionGroup`. Baseball code paths are untouched: football
leagues carry their own scoring and roster config in `league.football`, and
football projection groups store players in `group.footballPlayers`.

## Source Files

- `src/types/football.ts` — `FootballPosition`, `FootballRosterSlot`, `FootballScoringSettings`, `FootballRosterSettings`, `FootballLeagueConfig`, `FootballStats`, `FootballPlayer`
- `src/lib/football/index.ts` — public interface
- `src/lib/football/defaults.ts` — scoring presets (Standard / Half PPR / Full PPR / Blank), default roster, config normalization
- `src/lib/football/scoring.ts` — `calculateFootballPoints`
- `src/lib/football/csv.ts` — projections CSV parsing (`parseFootballCsv`, `mergeFootballPlayers`)
- `src/lib/football/par.ts` — FLEX/Superflex-aware replacement levels and PAR
- `src/lib/football/ranking.ts` — ranked-row build, filtering, sorting
- `src/lib/football/football.test.ts` — unit tests
- `src/lib/projections/publicDatasets.ts`, `scripts/generate-public-dataset.ts`, `scripts/generate-nflverse-football-csv.ts` — sport-scoped built-in prior-year dataset support
- `src/components/FootballLeaderboard.tsx` — football leaderboard UI
- `src/components/FootballCsvUpload.tsx` — football upload dialog
- `src/components/settings/FootballScoringSection.tsx`, `src/components/settings/FootballRosterSection.tsx`, `src/components/settings/footballConstants.ts` — settings UI

## Model

- Positions: `QB | RB | WR | TE | K | DST`. Roster slots add `FLEX` (RB/WR/TE)
  and `SUPERFLEX` (QB/RB/WR/TE) plus bench.
- A league's sport is chosen at creation (Settings → Leagues) and never
  changes. `normalizeLeague` fills `sport: "baseball"` for pre-existing data
  (persistence version 9) and fills default football config for football
  leagues.
- Draft state, league size, and team names are sport-agnostic — the existing
  snake-draft and keeper machinery works unchanged for football leagues.

## Scoring

`calculateFootballPoints` is a weighted sum over passing, rushing, receiving,
misc (2PT, fumbles lost), kicking, DST, and special-teams stats. Yardage
weights are per-yard (`0.04` = 1 pt / 25 passing yards). Presets differ mainly
in the `REC` weight (0 / 0.5 / 1), with ESPN/Sleeper-style default kicking and
DST values.

Kicking scoring uses separate made-FG bands (`0-19`, `20-29`, `30-39`,
`40-49`, `50+`), missed FG, made PAT, and missed PAT. When a projections
source only provides aggregate `FG` and `FG50` stats, non-50 makes use the
`30-39` weight and 50+ makes use the `50+` weight.

D/ST supports sacks, interceptions, recoveries, forced fumbles, TDs, safeties,
blocked kicks, and points-allowed bands (`0`, `1-6`, `7-13`, `14-20`, `21-27`,
`28-34`, `35+`). Special-teams D/ST stats (`ST_TD`, `ST_FF`, `ST_FR`) and
fumble-recovery TD stats (`FR_TD`) are parsed when present, but they use the
same `TD`, `FF`, and `FR` weights as ordinary D/ST events. Points-allowed bands
are counted when a CSV provides band counts; a season-total `PTS_ALLOWED`
column is still parsed and displayed but cannot be converted into weekly band
counts.

K and DST rows from sources that ship only an aggregate fantasy-points column
(no component stats) fall back to the provided `FPTS` value.

## CSV parsing

`parseFootballCsv` supports two header styles:

1. **Explicit headers** ("Pass Yds", `RUSH_TD`, "Rec", ...) via a
   case/punctuation-insensitive alias table.
2. **FantasyPros-style sectioned headers**, where bare `ATT`/`YDS`/`TDS`/`INT`
   tokens repeat across passing/rushing/receiving blocks. A stateful
   left-to-right walk assigns each ambiguous token to the section opened by
   the nearest preceding anchor column (`CMP` → passing, `REC`/`TGT` →
   receiving, `SACK` → dst, bare `ATT` → rushing).

When the file has no position column the parser infers a file-level position
(K/DST/QB from signature columns; RB/WR/TE from section order) or asks the
UI to collect one (`needsPositionSelection`). Player ids come from a
`PlayerId`-style column when present, otherwise a stable slug of
`name + position`, which lets per-position uploads merge into one group via
`mergeFootballPlayers`.

The same parser powers football public dataset generation. A generated
football prior-year payload stores players in `projectionGroup.footballPlayers`
with `sport: "football"` so the built-in baseline is resolved by football
leagues the same way baseball leagues resolve the built-in leaders dataset.

## PAR

Same semantics as baseball: allocate the best players to all roster slots
league-wide, including bench slots. Starting slots use greedy bipartite
matching so position, FLEX, and SUPERFLEX constraints are respected. Bench
slots use a football-specific positional demand heuristic: QB bench depth is
capped in 1-QB leagues, Superflex increases QB demand, K/DST receive no default
bench demand, and most flexible bench demand flows to RB/WR with a smaller TE
share. A slot's replacement level is the best eligible player remaining after
that full starter-plus-anticipated-bench allocation. A player's PAR is their
points above the lowest replacement level among slots they can fill (position
slot, FLEX, SUPERFLEX).
