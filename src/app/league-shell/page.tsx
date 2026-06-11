"use client";

import { usePathname } from "next/navigation";
import { BoardTab } from "@/components/board/BoardTab";
import { ConfigTab } from "@/components/config/ConfigTab";
import { DraftRoom } from "@/components/draftroom/DraftRoom";
import { IntelTab } from "@/components/intel/IntelTab";
import { PlanTab } from "@/components/plan/PlanTab";
import { LeagueScope } from "@/components/workspace/LeagueScope";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { parseLeaguePath } from "@/lib/leaguePath";

// THE league surface. Every /league/<id>/<tab> URL rewrites here (see
// next.config.ts), so the whole league experience is one prerendered static
// page: the id/tab come from the browser URL, tab switches are
// history.pushState, and a prep session costs the server zero requests after
// load. Anyone hitting /league-shell directly has no league id and gets
// bounced to the fleet by LeagueScope.
export default function LeagueShellPage() {
  return (
    <LeagueScope>
      <ShellBody />
    </LeagueScope>
  );
}

function ShellBody() {
  const pathname = usePathname();
  const { tab } = parseLeaguePath(pathname);

  // NIGHT takeover — no workspace chrome
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
