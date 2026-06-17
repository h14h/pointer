# Solstice — DraftSpa's Visual System

DraftSpa is a fantasy draft workspace for league-specific boards, target
planning, projection management, and live pick tracking. **Solstice** is the
visual language chosen for it (June 2026) after a three-round prototype
exploration (`/redesigns`, since deleted).

## The thesis

DraftSpa has two working contexts: planning a league before the draft and
tracking picks while the draft is live. Solstice gives those contexts distinct
visual states without forcing metaphor-heavy copy into the interface:

- **Workspace** (default): league setup, projections, board review, targets,
  and round planning. Bone paper, ink, racing green accent, clay warnings, and
  an 8px grid texture. Comfortable for repeated work and dense information.
- **Live draft** (`[data-mode="night"]` on `<html>`): the full-screen draft
  tracker. Deep navy, phosphor mint accent, and amber urgency. **Never red in
  live draft mode** — amber carries warnings.

The transition between workspace and live draft is visual, not explanatory.
Copy should name the workflow plainly: "workspace", "board", "targets",
"live draft", "track picks", and "log picks".

## Tokens & themes

One semantic token set, defined in [`src/app/globals.css`](../../src/app/globals.css):

- Components reference `var(--color-*)` names (`--color-bg-app`,
  `--color-surface-base`, `--color-accent`, `--color-warning`, …) — never raw
  hex values. shadcn variables map onto the same tokens.
- **Text on a colored fill uses the paired `*-fg` token**, never raw
  white/black: `--color-accent-fg` on accent, `--color-danger-fg` on danger,
  and `--color-inverse-fg` on `--color-inverse-bg` (the ink-filled brand CTA).
  These flip per theme — white-on-mint fails contrast at night.
- Themes only swap values: `:root` holds DAY, `[data-mode="night"]` holds
  NIGHT. **To add a theme** (e.g. a dark prep mode), add another
  `[data-mode="…"]` block — no component changes.
- The live-draft theme flip is owned by [`src/lib/useNightMode.ts`](../../src/lib/useNightMode.ts):
  mount the hook in any full-screen draft tracking surface to put the document
  into night mode while it's mounted. Hover states stay instant.

Typography: IBM Plex Sans (UI) + IBM Plex Mono (all data, numerals, labels),
loaded via `next/font` in the root layout. Utilities:

- `.font-data` — Plex Mono with tabular numerals; use for any number column.
- `.stamp` — the Solstice section-heading idiom (10px uppercase letterspaced
  mono, muted). Use it instead of ad-hoc small-caps styles.
- `.stamp-strong` — the same stamp with heavier ink (weight 600, default
  foreground) for table column headers and section h2s.
- `--z-sticky/--z-popover/--z-overlay/--z-veil` — the only sanctioned
  z-indexes.

## The molecule tier (use these, don't re-derive)

Small composed idioms have ONE owner each in `src/components/ui/` — new
surfaces must use them so "tweak once" stays true everywhere:

- `Chip` (`tone: neutral|accent|warning|danger`) — every small bordered
  stamped tag (sport stamps, status chips, vitals).
- `PanelHeader` (exported from `Panel.tsx`) — stamp title + right slot over a
  hairline rule, inside `<Panel padding="none">`.
- `LedgerRow` — the hairline-separated row (rosters, wires, targets, sources).
- `Button variant="inverse"` — the ink-filled brand CTA (Start live draft).
- `Input tone="underline"` — the pencil-line worksheet input.
- `BrandBar` (`src/components/brand/`) — the h-14 wordmark header bar; pair
  with `PageContainer` for page width.
- Dialogs: `AppDialog` (with `tone="destructive"` for confirms) — there is no
  other dialog shell. Class merging: always `cn` from `@/lib/utils`.

Brand lockup: [`src/components/brand/Wordmark.tsx`](../../src/components/brand/Wordmark.tsx)
(`DraftSpa` + the horizon mark). Tagline: **"league-specific draft boards."**
Voice: direct, compact, and operational. The product can look atmospheric; the
copy should stay plain and useful.

## Information architecture

Planning is the primary interface; live draft tracking is a temporary **mode**:

| URL | Surface |
| --- | --- |
| `/` | **Leagues** — one card per league (all sports), readiness bars, add-league, first-run onboarding |
| `/league/<id>/plan` | **Plan** — pick timeline (snake slots), targets, tier supply, per-round notes |
| `/league/<id>/board` | **Board** — the full ranked leaderboard (league-scored) |
| `/league/<id>/intel` | **Intel** — the sport-scoped projection library |
| `/league/<id>/config` | **Config** — identity, scoring, roster, draft order/keepers, danger zone |
| `/league/<id>/draft` | **Live draft** — full-screen tracker (tape, quick-log, board, rail) |
| `/settings` | legacy URL; redirects into config/intel/leagues |

League URLs are NOT filesystem routes: a rewrite in next.config.ts maps
`/league/:path*` onto the ONE prerendered
[`league-shell`](../../src/app/league-shell/page.tsx) page, which derives the
id/tab from the browser URL ([`src/lib/leaguePath.ts`](../../src/lib/leaguePath.ts)).
In-league navigation (tabs, live draft entry/exit) is `history.pushState` via
[`LeagueTabLink`](../../src/components/workspace/LeagueTabLink.tsx)/`pushLeaguePath`
— the Next router observes native history, so usePathname-driven components
re-render with **zero server traffic**. The shell mounts
[`LeagueScope`](../../src/components/workspace/LeagueScope.tsx) (syncs the
store's `activeLeagueId`; bounces unknown ids) and switches between
[`WorkspaceShell`](../../src/components/workspace/WorkspaceShell.tsx) chrome
and the live-draft takeover. **Don't add `/league/...` filesystem routes** —
add tabs to the shell + `LEAGUE_TABS` instead.

## Product decisions encoded in the data model

1. **Second-screen draft tracker.** Picks never auto-advance; the user logs every
   pick. `draftPlayer(playerId)` always logs to the on-clock team (from
   `getNextOpenPickIndex`). The current pick №/team must stay unmissable so
   users can confirm sync with their real draft platform.
2. **Sport-scoped projections.** Sources live in a per-sport library; a league
   selects one via `league.projectionGroupId`. Resolution (with fallbacks):
   `resolveProjectionGroupForLeague(league, groups)` in
   [`src/lib/projections/projectionGroups.ts`](../../src/lib/projections/projectionGroups.ts).
   Components must use it (or the `useLeagueProjectionGroup` selector) — never
   the legacy global `activeProjectionGroupId` (kept only for back-compat).
   Persist migration v11 assigned per-league sources from the old global.
3. **Strategy lives on the league** (`league.strategy = { targetIds,
   noteByRound }`) and `league.myTeamIndex` identifies the user's team —
   both sync to the cloud with the league JSON automatically.

Store selectors for screens: [`src/store/selectors.ts`](../../src/store/selectors.ts)
(`useRouteLeague`, `useActiveLeague`, `useLeagueProjectionGroup`).

## Extension points

- **Themes**: add a `[data-mode]` block (see above).
- **Fleet readiness checks**: `leagueReadiness(league, group)` in
  `src/components/fleet/leagueReadiness.ts` returns `{label, done}[]` — append
  checks there.
- **Tiers**: `src/lib/tiers` (natural-gap tiering over projected points) —
  tune thresholds or swap the algorithm in one place; Plan + draft surfaces
  consume its output.
- **New workspace tab**: add a folder under `league/[id]/(workspace)/`, a
  component dir under `src/components/<tab>/`, and one entry in
  `WorkspaceShell`'s `TABS`.

## Free-tier cost rules

Anonymous usage must stay (near-)zero backend load after initial page load:

- Public projection datasets are **static assets** under `public/datasets/`
  (mirrored there by `scripts/generate-public-dataset.ts`; cached via
  `headers()` in next.config.ts). The `/api/public-datasets` routes are
  `force-static` fallbacks for external consumers — the app never calls them.
- Every app route is **prerendered static** — the league experience is one
  shell page (see Information architecture) and in-league navigation is
  `history.pushState`, so a prep/draft session costs the server zero requests
  after load. Cross-page links to league URLs keep `prefetch={false}`, and
  `experimental.staleTimes` caches what does get fetched. Keep these habits
  when adding routes/links, and never reintroduce a dynamic segment for
  anonymous-reachable surfaces.
- Convex/Clerk must stay fully gated behind auth (no websocket, no queries
  signed out — see `CloudSync`'s `isLoaded && isPro` gate).

## Legacy notes

- `isDraftMode` and `activeProjectionGroupId` remain in the store for
  persisted-state compatibility but no production surface sets them; the
  `(test)/leaderboard-visual` fixture still uses `isDraftMode` to exercise
  the leaderboards' in-table draft controls.
- The leaderboards' built-in draft-mode UI is superseded by the draft room;
  it can be removed once the visual-test fixtures are retired.
