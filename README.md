# Pointer

A streamlined fantasy baseball **and football** draft board for uploading projection files, scoring players, and tracking picks in real time.

## Quick Start

```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## What You Can Do
- Pick your sport on first launch — a welcome screen sets up your first baseball or football league.
- Create baseball or football leagues, each with its own scoring, roster, and draft state (quick-create from the header's league menu).
- Upload projection CSV/TSV files (batters/pitchers for baseball; combined or per-position files for football).
- Tune scoring settings with presets (ESPN/Yahoo/Fantrax for baseball; Standard/Half PPR/Full PPR for football) or custom values.
- Toggle draft mode to track drafted players and keepers via snake draft.
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
- Draft mode is optional; when enabled, clicks draft players via snake-draft. Keepers are assigned in Settings.
