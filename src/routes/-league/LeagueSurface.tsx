/**
 * THE league surface. Both /league/$leagueId and the /league/$leagueId/$
 * splat render this; the id/tab arrive via the routing adapter's
 * useLeagueParams (typed route params). Unknown/stale league ids are bounced
 * to the home league list by LeagueScope.
 */

import { BoardTab } from "@/components/board/BoardTab";
import { ConfigTab } from "@/components/config/ConfigTab";
import { DraftRoom } from "@/components/draftroom/DraftRoom";
import { IntelTab } from "@/components/intel/IntelTab";
import { PlanTab } from "@/components/plan/PlanTab";
import { LeagueScope } from "@/components/workspace/LeagueScope";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useLeagueParams } from "@/lib/routing/adapter";

export function LeagueSurface() {
  return (
    <LeagueScope>
      <SurfaceBody />
    </LeagueScope>
  );
}

function SurfaceBody() {
  const { tab } = useLeagueParams();

  // Live draft takeover — no workspace chrome.
  if (tab === "draft") {
    return <DraftRoom />;
  }

  return (
    <WorkspaceShell>
      {tab === "board" ? (
        <BoardTab />
      ) : tab === "intel" ? (
        <IntelTab />
      ) : tab === "config" ? (
        <ConfigTab />
      ) : (
        <PlanTab />
      )}
    </WorkspaceShell>
  );
}
