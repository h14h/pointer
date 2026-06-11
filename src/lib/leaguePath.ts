"use client";

// League URLs (/league/<id>/<tab>) are served by ONE prerendered shell page
// (src/app/league-shell + a rewrite in next.config.ts) and the id/tab are
// derived client-side from the browser URL. Tab switches use
// history.pushState — the Next router picks it up (usePathname updates)
// without fetching anything, so an anonymous prep session costs the server
// zero requests after the shell loads.

export const LEAGUE_TABS = ["plan", "board", "intel", "config"] as const;
export type LeagueTab = (typeof LEAGUE_TABS)[number] | "draft";

export function parseLeaguePath(pathname: string | null): {
  leagueId: string | null;
  tab: LeagueTab;
} {
  const segments = (pathname ?? "").split("/").filter(Boolean);
  if (segments[0] !== "league" || !segments[1] || segments[1] === "league-shell") {
    return { leagueId: null, tab: "plan" };
  }
  const tabSegment = segments[2];
  const tab: LeagueTab =
    tabSegment === "draft" || (LEAGUE_TABS as readonly string[]).includes(tabSegment)
      ? (tabSegment as LeagueTab)
      : "plan";
  return { leagueId: segments[1], tab };
}

export function leagueHref(leagueId: string, tab: LeagueTab): string {
  return `/league/${leagueId}/${tab}`;
}

/**
 * Navigate between league surfaces without a server round-trip. The Next app
 * router integrates with native history methods, so usePathname() updates and
 * the shell re-renders; back/forward keep working.
 */
export function pushLeaguePath(leagueId: string, tab: LeagueTab): void {
  window.history.pushState(null, "", leagueHref(leagueId, tab));
  window.scrollTo(0, 0);
}
