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

`calculateFootballPoints` is a flat weighted sum over passing, rushing,
receiving, misc (2PT, fumbles lost), kicking, and DST stats. Yardage weights
are per-yard (`0.04` = 1 pt / 25 passing yards). Presets differ only in the
`REC` weight (0 / 0.5 / 1).

K and DST rows from sources that ship only an aggregate fantasy-points column
(no component stats) fall back to the provided `FPTS` value.

DST points-allowed tiers are not modeled in v1; the `PTS_ALLOWED` stat is
parsed and displayed but unweighted.

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

## PAR

Same semantics as baseball: allocate the best players to all starting slots
league-wide (greedy bipartite matching, best points first), then a slot's
replacement level is the best player remaining in the pool. A player's PAR is
their points above the lowest replacement level among slots they can fill
(position slot, FLEX, SUPERFLEX).
