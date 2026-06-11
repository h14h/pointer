"use client";

import { pushLeaguePath } from "@/lib/leaguePath";
import { beginNightTransition } from "@/lib/nightTransition";

/**
 * The dawn exit: the veil falls, the theme returns to day underneath it, and
 * the workspace lifts it on mount (useSettleNightTransition in the shell).
 * Navigation is history.pushState — the draft room and the workspace are the
 * same static shell page, so leaving costs the server nothing.
 */
export function EndDraftNightButton({
  leagueId,
  className,
}: {
  leagueId: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className ? `cursor-pointer ${className}` : "cursor-pointer"}
      onClick={async () => {
        await beginNightTransition(false);
        pushLeaguePath(leagueId, "plan");
      }}
    >
      End draft night
    </button>
  );
}
