# Pointer - Fantasy Baseball Draft Aid Implementation Plan

## Project Overview

A web app to help with fantasy baseball drafts by calculating projected point totals based on custom league scoring settings.

## Tech Stack

- **Framework**: Next.js 16 with App Router + TypeScript
- **Styling**: Tailwind CSS v4
- **Tables**: TanStack Table v8
- **State Management**: Zustand with localStorage persistence
- **CSV Parsing**: Papa Parse
- **Package Manager**: Bun
- **Deployment**: Vercel (static export)

---

## Phase 1: Core Data Types & State Management

### 1.1 Define TypeScript Types

Create `/src/types/index.ts`:

```typescript
// Player data from CSV upload
interface Player {
  id: string;
  name: string;
  team: string;
  positions: string[];  // e.g., ["1B", "OF"]

  // Batting stats
  AB?: number;
  R?: number;
  H?: number;
  HR?: number;
  RBI?: number;
  SB?: number;
  BB?: number;
  K?: number;
  AVG?: number;
  OBP?: number;
  SLG?: number;

  // Pitching stats
  IP?: number;
  W?: number;
  L?: number;
  SV?: number;
  ERA?: number;
  WHIP?: number;
  SO?: number;
  QS?: number;
  HLD?: number;
}

// League scoring configuration
interface ScoringSettings {
  name: string;

  // Batting points
  R: number;
  H: number;
  single: number;
  double: number;
  triple: number;
  HR: number;
  RBI: number;
  SB: number;
  CS: number;
  BB: number;
  K: number;
  HBP: number;

  // Pitching points
  IP: number;
  W: number;
  L: number;
  SV: number;
  BS: number;
  SO: number;
  HA: number;    // Hits allowed
  BBA: number;   // Walks allowed
  ER: number;
  QS: number;
  HLD: number;
}

// Draft state
interface DraftState {
  draftedPlayerIds: Set<string>;
  keeperPlayerIds: Set<string>;
}

// Player with calculated points
interface RankedPlayer extends Player {
  projectedPoints: number;
  isDrafted: boolean;
  isKeeper: boolean;
}
```

### 1.2 Create Zustand Store

Create `/src/store/index.ts`:

- `players`: Array of uploaded players
- `scoringSettings`: Current league scoring config
- `draftState`: Drafted/keeper player IDs
- `isDraftMode`: Boolean toggle
- Actions: `setPlayers`, `updateScoring`, `toggleDrafted`, `toggleKeeper`, `resetDraft`
- Persist to localStorage

---

## Phase 2: CSV Upload & Parsing

### 2.1 CSV Upload Component

Create `/src/components/CsvUpload.tsx`:

- Drag-and-drop zone + file input
- Parse CSV with Papa Parse
- Map columns to Player fields (with column mapping UI)
- Validate required fields (name, at least one stat)
- Show preview of parsed data before confirming

### 2.2 Column Mapping

Support common projection source formats:
- FanGraphs Depth Charts
- Steamer
- ZiPS
- ATC

Auto-detect format when possible, allow manual mapping.

---

## Phase 3: Scoring Settings Form

### 3.1 Scoring Form Component

Create `/src/components/ScoringForm.tsx`:

- Tabbed sections: Batting | Pitching
- Number inputs for each stat category
- Preset buttons for common platforms (ESPN, Yahoo, custom)
- Save/Load scoring presets to localStorage
- Real-time validation

### 3.2 Default Presets

Include presets for:
- ESPN Standard Points
- Yahoo Standard Points
- Blank (all zeros)

---

## Phase 4: Player Leaderboard

### 4.1 Points Calculation

Create `/src/lib/calculatePoints.ts`:

- Function: `calculatePlayerPoints(player: Player, settings: ScoringSettings): number`
- Handle both hitters and pitchers
- Handle missing stats gracefully

### 4.2 Leaderboard Table

Create `/src/components/Leaderboard.tsx`:

Using TanStack Table:
- Columns: Rank, Name, Team, Position(s), Projected Points, individual stat columns
- Sorting: Click column headers (default: points DESC)
- Filtering:
  - Position dropdown (All, C, 1B, 2B, 3B, SS, OF, SP, RP)
  - Search by name
  - Show/hide drafted players toggle
- Pagination or virtual scrolling for large datasets

### 4.3 Position Filtering Logic

- "All" shows everyone
- Position filters show players eligible at that position
- Multi-position players appear in all relevant filters

---

## Phase 5: Draft Mode

### 5.1 Draft Mode Toggle

- Toggle button in header
- When active, show draft-specific UI

### 5.2 Draft Features

- Click row or checkbox to mark player as drafted
- Right-click or long-press to mark as keeper (different visual)
- Visual distinction:
  - Available: Normal row
  - Drafted: Grayed out / strikethrough
  - Keeper: Highlighted (e.g., gold border)
- Quick filters:
  - "Show available only" (default in draft mode)
  - "Show my keepers"
  - "Show all"

### 5.3 Draft Summary Panel

Sidebar or collapsible panel showing:
- Total players drafted
- Players drafted by position
- Keepers list

---

## Phase 6: UI/UX Polish

### 6.1 Layout

Create responsive layout:
- Header: App name, Draft Mode toggle, Settings gear
- Main: Leaderboard table (full width)
- Modals: CSV upload, Scoring settings

### 6.2 Dark Mode

Support system preference with toggle override.

### 6.3 Mobile Responsiveness

- Collapsible columns on mobile
- Touch-friendly draft controls

---

## File Structure

```
/src
  /app
    layout.tsx          # Root layout with providers
    page.tsx            # Main page with leaderboard
    globals.css         # Tailwind imports
  /components
    CsvUpload.tsx       # CSV upload modal
    ScoringForm.tsx     # Scoring settings modal
    Leaderboard.tsx     # Main table component
    DraftSummary.tsx    # Draft mode sidebar
    Header.tsx          # App header
    PositionFilter.tsx  # Position dropdown
    SearchInput.tsx     # Player search
  /store
    index.ts            # Zustand store
  /lib
    calculatePoints.ts  # Points calculation logic
    csvParser.ts        # CSV parsing utilities
    presets.ts          # Scoring presets
  /types
    index.ts            # TypeScript interfaces
```

---

## Implementation Order

1. **Types & Store** - Foundation for everything else
2. **CSV Upload** - Need data to work with
3. **Basic Leaderboard** - Display uploaded players
4. **Scoring Form** - Configure point values
5. **Points Calculation** - Integrate scoring with leaderboard
6. **Filtering & Sorting** - Make table useful
7. **Draft Mode** - Core draft functionality
8. **Polish** - Dark mode, responsiveness, presets

---

## Deployment

1. Configure `next.config.ts` for static export (optional, or use default SSR)
2. Connect GitHub repo to Vercel
3. Deploy on push to main

---

## Future Enhancements (Out of Scope for v1)

- Auction values / dollar values
- Player notes
- Mock draft simulation
- Import from ESPN/Yahoo leagues
- Multi-user draft room with real-time sync
- Historical stats comparison
