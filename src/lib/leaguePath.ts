// League URLs are /league/<id>/<tab>. The routes (src/routes/league.*) render
// pure client shells, so a prep session costs the server zero requests after
// load. Tab switches use history.pushState — TanStack Router patches the
// native history methods, so it re-matches and the route params update
// without fetching anything.
//
// URL → screen behavior is locked by src/test/contracts/leagueRoutes/
// fixtures.ts and e2e/league-url-contract.spec.ts; the param parsing itself
// lives in useLeagueParams (src/lib/routing/adapter.tsx).

export const LEAGUE_TABS = ["plan", "board", "intel", "config"] as const;
export type LeagueTab = (typeof LEAGUE_TABS)[number] | "draft";

export function leagueHref(leagueId: string, tab: LeagueTab): string {
  return `/league/${leagueId}/${tab}`;
}

/**
 * Navigate between league surfaces without a server round-trip (see module
 * note). Back/forward keep working.
 */
export function pushLeaguePath(leagueId: string, tab: LeagueTab): void {
  window.history.pushState(null, "", leagueHref(leagueId, tab));
  window.scrollTo(0, 0);
}
