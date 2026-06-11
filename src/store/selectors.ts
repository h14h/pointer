"use client";

import { usePathname } from "next/navigation";
import { parseLeaguePath } from "@/lib/leaguePath";
import { resolveProjectionGroupForLeague } from "@/lib/projections";
import { useStore } from "@/store";
import type { League, ProjectionGroup } from "@/types";

/**
 * The league the app is currently operating on. Falls back to the first
 * league so screens render sensibly before any explicit selection.
 */
export function useActiveLeague(): League | undefined {
  const { leagues, activeLeagueId } = useStore();
  return leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
}

/**
 * The league named by the /league/<id>/... URL (undefined off-route or when
 * the id doesn't exist). Parsed from the browser pathname — league URLs are
 * served by the static shell, so there is no route param to read. Updates on
 * history.pushState tab switches. Prefer this inside the workspace — it
 * can't race the activeLeagueId sync on navigation.
 */
export function useRouteLeague(): League | undefined {
  const pathname = usePathname();
  const { leagues } = useStore();
  const { leagueId } = parseLeaguePath(pathname);
  return leagueId ? leagues.find((l) => l.id === leagueId) : undefined;
}

/**
 * The projection source a league actually uses: its own sport-scoped
 * selection, with library fallbacks. Components should consume this instead
 * of the legacy global activeProjectionGroupId.
 */
export function useLeagueProjectionGroup(league: League | undefined): ProjectionGroup | null {
  const { projectionGroups } = useStore();
  if (!league) return null;
  return resolveProjectionGroupForLeague(league, projectionGroups);
}
