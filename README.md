# Pointer

A streamlined fantasy baseball draft board for uploading projection files, scoring players, and tracking picks in real time.

## Quick Start

```bash
bun install
bun dev
```

Open `http://localhost:3000`.

## What You Can Do
- Upload batter and pitcher projection CSV/TSV files.
- Tune scoring settings with presets or custom values.
- Toggle draft mode to track drafted players and keepers.

## Project Structure
- `src/app`: Next.js app shell
- `src/components`: UI and workflow components
- `src/lib`: parsing, scoring, and eligibility helpers
- `src/store`: app state and persistence

## Notes
- CSV files can include `MLBAMID` or a custom ID column for precise player matching.
- Draft mode is optional; when enabled, clicks mark drafted players and right-clicks mark keepers.
