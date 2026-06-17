# DraftSpa

A focused fantasy baseball **and football** draft workspace for league-specific rankings, target planning, projection uploads, and live pick tracking.

## Quick Start

```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## What You Can Do
- Pick your sport on first launch to create a baseball or football league.
- Manage multiple baseball and football leagues, each with its own scoring, roster, projections, targets, and draft state.
- Upload projection CSV/TSV files (batters/pitchers for baseball; combined or per-position files for football).
- Tune scoring settings with presets (ESPN/Yahoo/Fantrax for baseball; Standard/Half PPR/Full PPR for football) or custom values.
- Start a live draft tracker to log picks against the league's ranked board.
- Optional **Pro** tier (Clerk + Convex): cloud league backup and live multi-device sync — see [docs/monetization.md](docs/monetization.md). Without configuration the app is fully local and free.

## Project Structure
- `src/app`: Next.js app shell
- `src/components`: UI and workflow components
- `src/lib`: deep modules (scoring, draft, league, eligibility, projections, football, leaderboard, persistence, pro)
- `src/store`: thin Zustand coordination layer
- `src/types`: domain types split by concern (player, league, draft, projection, football)
- `convex`: Convex backend functions for Pro cloud sync

## Notes
- Baseball CSV files can include `MLBAMID` or a custom ID column for precise player matching.
- Football CSVs work with explicit headers or FantasyPros-style exports; files without a position column are auto-detected or assigned a position at upload.
- Live draft tracking is optional; when enabled, clicks draft players via snake draft. Keepers are assigned in Settings.
