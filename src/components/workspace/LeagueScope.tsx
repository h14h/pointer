"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PublicDatasetBootstrap } from "@/components/PublicDatasetBootstrap";
import { useRouteLeague } from "@/store/selectors";
import { useStore } from "@/store";

/**
 * Mounted by the league shell page. Keeps the store's activeLeagueId in
 * sync with the route (so all existing active-league store actions target
 * the league being viewed) and bounces back to the home league list when the id is
 * unknown (deleted league, stale link).
 */
export function LeagueScope({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const league = useRouteLeague();
  const { hasHydrated, activeLeagueId, setActiveLeague } = useStore();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!league) {
      router.replace("/");
      return;
    }
    if (activeLeagueId !== league.id) {
      setActiveLeague(league.id);
    }
  }, [hasHydrated, league, activeLeagueId, setActiveLeague, router]);

  return (
    <>
      <PublicDatasetBootstrap />
      {children}
    </>
  );
}
