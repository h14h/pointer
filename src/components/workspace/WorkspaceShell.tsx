"use client";

import { Link, usePathname } from "@/lib/routing/adapter";
import { BrandBar } from "@/components/brand/BrandBar";
import { AccountControls } from "@/components/pro/AccountControls";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PageContainer } from "@/components/ui/PageContainer";
import { parseLeaguePath, pushLeaguePath, LEAGUE_TABS } from "@/lib/leaguePath";
import {
  beginNightTransition,
  useSettleNightTransition,
} from "@/lib/nightTransition";
import { getProjectionGroupDisplayName } from "@/lib/projections";
import { useLeagueProjectionGroup, useRouteLeague } from "@/store/selectors";
import { LeagueTabLink } from "./LeagueTabLink";

const TAB_LABELS: Record<(typeof LEAGUE_TABS)[number], string> = {
  plan: "Plan",
  board: "Board",
  intel: "Intel",
  config: "Config",
};

/**
 * The chrome for a league workspace: brand bar, league masthead, vitals chips,
 * live draft entry, and the tab rail. All in-league navigation is
 * history.pushState (zero server traffic) — the whole workspace is one static
 * shell page.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const league = useRouteLeague();
  const group = useLeagueProjectionGroup(league);

  // Returning from live draft mode lands here — lift the transition veil.
  useSettleNightTransition();

  if (!league) {
    // Pre-hydration (or unknown id — LeagueScope is about to redirect)
    return <div className="min-h-screen" />;
  }

  const sportLabel = league.sport === "football" ? "NFL" : "MLB";
  const { tab: activeTab } = parseLeaguePath(pathname);

  return (
    <div className="min-h-screen">
      <BrandBar right={<AccountControls />} />

      <PageContainer className="pt-6">
        <Link
          href="/"
          className="font-data text-xs text-[var(--color-fg-muted)] underline decoration-[var(--color-border-default)] underline-offset-4 hover:text-[var(--color-fg-default)]"
        >
          leagues /
        </Link>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-fg-default)]">
              {league.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Chip>{sportLabel}</Chip>
              <Chip>{league.leagueSettings.leagueSize} teams</Chip>
              <Chip>
                src · {group ? getProjectionGroupDisplayName(group) : "none"}
              </Chip>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Button
              variant="inverse"
              size="md"
              onClick={async () => {
                await beginNightTransition(true);
                pushLeaguePath(league.id, "draft");
              }}
            >
              Start live draft
            </Button>
            <span className="stamp hidden sm:block">
              track every pick against this league&apos;s board.
            </span>
          </div>
        </div>

        <nav className="mt-6 flex gap-6 border-b border-[var(--color-border-soft)]">
          {LEAGUE_TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <LeagueTabLink
                key={tab}
                leagueId={league.id}
                tab={tab}
                aria-current={isActive ? "page" : undefined}
                className={`font-data -mb-px border-b-2 px-1 pb-2.5 text-[13px] uppercase tracking-[0.12em] ${
                  isActive
                    ? "border-[var(--color-accent)] font-semibold text-[var(--color-fg-default)]"
                    : "border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
                }`}
              >
                {TAB_LABELS[tab]}
              </LeagueTabLink>
            );
          })}
        </nav>
      </PageContainer>

      <PageContainer as="main" className="py-6">
        {children}
      </PageContainer>
    </div>
  );
}
