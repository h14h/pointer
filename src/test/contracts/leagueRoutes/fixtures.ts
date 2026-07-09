// League URL contract — plain-data fixtures.
//
// These cases lock the OBSERVABLE routing behavior of every /league/* URL:
// which screen renders and which tab is active for a given browser URL.
// They deliberately say nothing about HOW the URL is resolved (originally a
// Next.js rewrite onto one static shell page with client-side pathname
// parsing; since the TanStack Start migration, typed router routes —
// src/routes/league.* — feeding useLeagueParams in
// src/lib/routing/adapter.tsx). The fixture list survived that migration
// UNCHANGED, and must survive any future one: bookmarks must not break.
//
// The locked behavior (today implemented by src/routes/league.*,
// src/lib/routing/adapter.tsx, src/components/workspace/WorkspaceShell.tsx
// and src/components/workspace/LeagueScope.tsx):
//   - segments are split on "/" with empty segments dropped
//   - segment[1] is the league id; segment[2] is the tab
//   - tab must be exactly one of plan|board|intel|config|draft (case
//     sensitive); anything else falls back to "plan"
//   - extra trailing segments are ignored
//   - "draft" renders the live draft room WITHOUT the workspace chrome
//   - no id / unknown id / the reserved "league-shell" segment client-side
//     redirects to the home league list ("/")

/** The four workspace tabs, in rail order. "plan" is the default tab. */
export const WORKSPACE_TABS = ["plan", "board", "intel", "config"] as const;
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

/** Visible tab-rail labels (accessible names of the tab links). */
export const TAB_LABELS: Record<WorkspaceTab, string> = {
  plan: "Plan",
  board: "Board",
  intel: "Intel",
  config: "Config",
};

export type LeagueRouteExpectation =
  /** League workspace chrome renders (league name heading + tab rail) with exactly this tab marked active (aria-current="page"). */
  | { screen: "workspace"; activeTab: WorkspaceTab }
  /** Live draft room takeover renders (pick-log input), with NO workspace tab rail. */
  | { screen: "draft-room" }
  /** Client-side redirect lands on the home league list at "/". */
  | { screen: "home"; via: "client-redirect" };

export interface LeagueRouteCase {
  /** Stable, human-readable case name (used as the test title). */
  name: string;
  /**
   * URL path to visit. The literal token "{leagueId}" is replaced by the
   * test harness with the id of a league that exists in local persistence.
   */
  path: string;
  expected: LeagueRouteExpectation;
}

export const leagueRouteCases: LeagueRouteCase[] = [
  // --- canonical URLs: bare id + every tab ------------------------------
  {
    name: "bare league id defaults to the Plan tab",
    path: "/league/{leagueId}",
    expected: { screen: "workspace", activeTab: "plan" },
  },
  {
    name: "explicit /plan renders the Plan tab",
    path: "/league/{leagueId}/plan",
    expected: { screen: "workspace", activeTab: "plan" },
  },
  {
    name: "/board renders the Board tab",
    path: "/league/{leagueId}/board",
    expected: { screen: "workspace", activeTab: "board" },
  },
  {
    name: "/intel renders the Intel tab",
    path: "/league/{leagueId}/intel",
    expected: { screen: "workspace", activeTab: "intel" },
  },
  {
    name: "/config renders the Config tab",
    path: "/league/{leagueId}/config",
    expected: { screen: "workspace", activeTab: "config" },
  },
  {
    name: "/draft renders the live draft room takeover (no workspace chrome)",
    path: "/league/{leagueId}/draft",
    expected: { screen: "draft-room" },
  },

  // --- trailing-slash variants ------------------------------------------
  {
    name: "trailing slash after league id still defaults to Plan",
    path: "/league/{leagueId}/",
    expected: { screen: "workspace", activeTab: "plan" },
  },
  {
    name: "trailing slash after a tab keeps that tab active",
    path: "/league/{leagueId}/board/",
    expected: { screen: "workspace", activeTab: "board" },
  },

  // --- unknown / malformed tab segments (current behavior: fall back to
  // --- Plan, never 404 — a stale bookmark still lands somewhere useful) --
  {
    name: "unknown tab name falls back to the Plan tab",
    path: "/league/{leagueId}/roster",
    expected: { screen: "workspace", activeTab: "plan" },
  },
  {
    name: "tab matching is case sensitive — /BOARD falls back to Plan",
    path: "/league/{leagueId}/BOARD",
    expected: { screen: "workspace", activeTab: "plan" },
  },
  {
    name: "garbage tab segment falls back to the Plan tab",
    path: "/league/{leagueId}/!!!",
    expected: { screen: "workspace", activeTab: "plan" },
  },
  {
    name: "extra path segments after a valid tab are ignored",
    path: "/league/{leagueId}/board/extra/garbage",
    expected: { screen: "workspace", activeTab: "board" },
  },

  // --- missing / unknown league id: bounce home --------------------------
  {
    name: "/league with no id redirects to the home league list",
    path: "/league",
    expected: { screen: "home", via: "client-redirect" },
  },
  {
    name: "/league/ (trailing slash, no id) redirects to the home league list",
    path: "/league/",
    expected: { screen: "home", via: "client-redirect" },
  },
  {
    name: "unknown league id redirects to the home league list",
    path: "/league/no-such-league-id-000",
    expected: { screen: "home", via: "client-redirect" },
  },
  {
    name: "reserved 'league-shell' id segment redirects to the home league list",
    path: "/league/league-shell",
    expected: { screen: "home", via: "client-redirect" },
  },
  {
    // Empty segments are dropped when parsing, so "board" is read as a league
    // id here — and no league has that id, so this bounces home. (Locked
    // as observed; nobody should be minting such URLs.)
    name: "double slash before a tab is treated as an unknown league id and redirects home",
    path: "/league//board",
    expected: { screen: "home", via: "client-redirect" },
  },
];
