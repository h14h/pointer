"use client";

import { FootballLeaderboard } from "@/components/FootballLeaderboard";
import { Leaderboard } from "@/components/Leaderboard";
import { useRouteLeague } from "@/store/selectors";

/**
 * The Board tab: the full ranked leaderboard for this league's sport, scored
 * with this league's settings. The leaderboard components read the active
 * league from the store (kept in sync by LeagueScope).
 */
export function BoardTab() {
  const league = useRouteLeague();
  if (!league) return null;
  return league.sport === "football" ? <FootballLeaderboard /> : <Leaderboard />;
}
