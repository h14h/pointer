"use client";

import { BrandBar } from "@/components/brand/BrandBar";
import { PublicDatasetBootstrap } from "@/components/PublicDatasetBootstrap";
import { AccountControls } from "@/components/pro/AccountControls";
import { PageContainer } from "@/components/ui/PageContainer";
import { useSettleNightTransition } from "@/lib/nightTransition";
import { resolveProjectionGroupForLeague } from "@/lib/projections";
import { useStore } from "@/store";
import { AddLeagueCard } from "./AddLeagueCard";
import { LeagueCard } from "./LeagueCard";
import { OnboardingHero } from "./OnboardingHero";

/**
 * DraftSpa's home surface. One card per league across sports; each opens its
 * workspace or live draft tracker.
 */
export function FleetPage() {
  const { leagues, hasHydrated, hasOnboarded, projectionGroups } = useStore();
  // Safe landing spot if a live-draft transition ends here.
  useSettleNightTransition();

  const sportCount = new Set(leagues.map((league) => league.sport)).size;
  const showFleet = hasHydrated && hasOnboarded;

  return (
    <div className="min-h-screen">
      <PublicDatasetBootstrap />

      <BrandBar
        right={
          <div className="flex items-center gap-4">
            {showFleet ? (
              <span className="stamp hidden whitespace-nowrap sm:inline">
                {leagues.length} {leagues.length === 1 ? "league" : "leagues"} ·{" "}
                {sportCount} {sportCount === 1 ? "sport" : "sports"}
              </span>
            ) : null}
            <AccountControls />
          </div>
        }
      />

      {!hasHydrated ? null : !hasOnboarded ? (
        <OnboardingHero />
      ) : (
        <PageContainer as="main" className="py-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-data text-3xl font-semibold tracking-tight">
              Leagues
            </h1>
            <span className="stamp">
              settings, projections, draft boards, and live tracking by league.
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <LeagueCard
                key={league.id}
                league={league}
                group={resolveProjectionGroupForLeague(league, projectionGroups)}
              />
            ))}
            <AddLeagueCard />
          </div>
        </PageContainer>
      )}
    </div>
  );
}
