"use client";

import { useMemo } from "react";
import { LeagueTabLink } from "@/components/workspace/LeagueTabLink";
import { Panel } from "@/components/ui/Panel";
import { normalizeFootballConfig, buildFootballRankedPlayers } from "@/lib/football";
import { buildBaseRankedPlayers } from "@/lib/leaderboard";
import { useStore } from "@/store";
import { useLeagueProjectionGroup, useRouteLeague } from "@/store/selectors";
import type { League } from "@/types";
import { PickTimeline } from "./PickTimeline";
import { TargetsPanel } from "./TargetsPanel";
import { TierSupplyPanel } from "./TierSupplyPanel";
import {
  buildRoundSlots,
  fromBaseballRanked,
  fromFootballRanked,
  getMyPickOveralls,
  getTotalRounds,
  type PlanPlayer,
} from "./planData";

/**
 * The Plan tab: the strategy worksheet — pick timeline, targets, tier supply.
 * Built before the live draft, then carried into the tracker.
 */
export function PlanTab() {
  const league = useRouteLeague();
  if (!league) return null;
  // Keyed remount per league so uncontrolled note inputs never leak across
  // leagues when the route changes.
  return <PlanWorksheet key={league.id} league={league} />;
}

function PlanWorksheet({ league }: { league: League }) {
  const group = useLeagueProjectionGroup(league);
  const { mergeTwoWayRankings, toggleTarget, setRoundNote } = useStore();

  const players = useMemo<PlanPlayer[]>(() => {
    if (!group) return [];
    if (league.sport === "football") {
      return fromFootballRanked(
        buildFootballRankedPlayers({
          activeGroup: group,
          config: normalizeFootballConfig(league.football),
          leagueSize: league.leagueSettings.leagueSize,
          draftState: league.draftState,
          playerStatOverrides: league.playerStatOverrides,
        })
      );
    }
    return fromBaseballRanked(
      buildBaseRankedPlayers({
        activeGroup: group,
        playerView: "all",
        scoringSettings: league.scoringSettings,
        leagueSettings: league.leagueSettings,
        draftState: league.draftState,
        mergeTwoWayRankings,
      })
    );
  }, [
    group,
    league.sport,
    league.football,
    league.scoringSettings,
    league.leagueSettings,
    league.draftState,
    mergeTwoWayRankings,
  ]);

  const totalRounds = useMemo(
    () =>
      getTotalRounds(
        league,
        league.sport === "football"
          ? normalizeFootballConfig(league.football).roster
          : null
      ),
    [league]
  );

  const slots = useMemo(
    () => buildRoundSlots(league, players, totalRounds),
    [league, players, totalRounds]
  );

  const myPickOveralls = useMemo(
    () => getMyPickOveralls(league, totalRounds),
    [league, totalRounds]
  );

  if (!group) {
    return (
      <Panel as="section" className="text-center">
        <div className="py-8">
          <h2 className="stamp">No {league.sport} source selected</h2>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            choose one in{" "}
            <LeagueTabLink
              leagueId={league.id}
              tab="intel"
              className="text-[var(--color-accent)] underline decoration-[var(--color-border-default)] underline-offset-4 hover:decoration-[var(--color-accent)]"
            >
              Intel
            </LeagueTabLink>{" "}
            — the worksheet prints from your projection pool.
          </p>
        </div>
      </Panel>
    );
  }

  const strategy = league.strategy ?? { targetIds: [], noteByRound: {} };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
        <PickTimeline
          slots={slots}
          noteByRound={strategy.noteByRound}
          onSaveNote={setRoundNote}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <TargetsPanel
          players={players}
          targetIds={strategy.targetIds}
          myPickOveralls={myPickOveralls}
          onToggleTarget={toggleTarget}
        />
        <TierSupplyPanel players={players} sport={league.sport} />
      </div>
    </div>
  );
}
