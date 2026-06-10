# Onboarding

First-run welcome screen that puts sport selection front and center instead of
dropping new visitors straight onto a leaderboard they never chose.

## Source Files

- `src/components/Welcome.tsx` — landing screen with baseball/football sport cards
- `src/components/Welcome.test.tsx` — component tests
- `src/store/index.ts` — `hasOnboarded` flag and `completeOnboarding(sport)` action
- `src/lib/persistence/index.ts` — migration marks pre-v10 data as onboarded
- `src/app/page.tsx` — view gating (blank shell → welcome → leaderboard)

## Behavior

- `/` waits for IndexedDB hydration, then renders the welcome screen when
  `hasOnboarded` is false, otherwise the sport-appropriate leaderboard.
- Picking a sport calls `completeOnboarding(sport)`:
  - On a fresh install (only the pristine deterministic default league,
    `updatedAt === 0`), the placeholder league is **replaced** by a new league
    of the chosen sport ("My Baseball League" / "My Football League").
  - Otherwise it activates an existing league of that sport, or appends one.
  - Either way `hasOnboarded` becomes true and is persisted.
- Existing installs never see the screen: every migration path (pre-v6, v6–v9)
  sets `hasOnboarded: true`. Only state created after persistence version 10
  can carry `hasOnboarded: false`.
- The settings page and direct routes are not gated — only the `/` view.

## Ongoing sport switching

After onboarding, sport is a first-class mode in the header, separate from
league selection:

- `SportSwitcher` (`src/components/SportSwitcher.tsx`) is a segmented
  Baseball/Football control rendered in the header on desktop and mobile.
  Switching calls the store's `switchSport(sport)`, which activates the most
  recently updated league of that sport — or creates one ("My Baseball
  League" / "My Football League") when none exists.
- The league dropdown is scoped to the active sport: it only lists leagues of
  that sport, and its footer quick-create action makes a new league of the
  current sport. Cross-sport navigation belongs to the switcher, not the
  league list.
- The page label under the masthead reads "Baseball · Leaderboard" /
  "Football · Settings" etc., so the active mode is always visible.
