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
import { SiteFooter } from "@/components/legal/SiteFooter";
import { Button } from "@/components/ui/Button";
import { buildBackupPayload, downloadBackup } from "@/lib/exportBackup";

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
    <div className="flex min-h-screen flex-col">
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-[var(--color-fg-muted)]">
              Your leagues are saved in this browser only. Clearing site data
              wipes them. Export a backup, or use DraftSpa Pro for cloud
              backup when it is live.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadBackup(
                  buildBackupPayload({ leagues, projectionGroups }),
                )
              }
            >
              Export backup
            </Button>
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
      {showFleet ? <SiteFooter /> : null}
    </div>
  );
}
