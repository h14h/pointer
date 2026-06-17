"use client";

import { EndDraftNightButton } from "./EndDraftNightButton";
import { pad2, slotLabel } from "./model";

/**
 * Top sync strip — the glance row. The current overall pick, round.pick, and
 * the on-clock team must be unmissable so the user can confirm DraftSpa
 * matches their real draft platform.
 */
export function SyncStrip({
  leagueId,
  leagueName,
  overall,
  round,
  pickInRound,
  onClockTeamName,
  isMyPick,
  myNextOverall,
  picksUntilMine,
  loggedCount,
  totalPicks,
}: {
  leagueId: string;
  leagueName: string;
  overall: number;
  round: number;
  pickInRound: number;
  onClockTeamName: string;
  isMyPick: boolean;
  myNextOverall: number | null;
  picksUntilMine: number;
  loggedCount: number;
  totalPicks: number;
}) {
  return (
    <header className="flex flex-none items-stretch gap-0 border-b border-[var(--color-border-soft)] bg-[var(--color-surface-base)]">
      {/* brand / league */}
      <div className="hidden flex-col justify-center gap-0.5 border-r border-[var(--color-border-soft)] px-4 py-2 lg:flex">
        <span className="font-data text-sm font-medium text-[var(--color-fg-default)]">
          DraftSpa
        </span>
        <span className="stamp">live draft · {leagueName}</span>
      </div>

      {/* pick number */}
      <div className="flex flex-col justify-center gap-0.5 border-r border-[var(--color-border-soft)] px-5 py-2">
        <span className="stamp">on the board</span>
        <span className="font-data text-3xl font-semibold leading-none text-[var(--color-fg-default)]">
          PICK {overall}
        </span>
        <span className="stamp">
          {slotLabel(round, pickInRound)} · {loggedCount} of {totalPicks} logged
        </span>
      </div>

      {/* on the clock */}
      <div
        className={
          isMyPick
            ? "flex flex-col justify-center gap-0.5 border-r border-[var(--color-border-soft)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,transparent)] px-5 py-2 shadow-[inset_0_-2px_0_var(--color-accent)]"
            : "flex flex-col justify-center gap-0.5 border-r border-[var(--color-border-soft)] bg-[color:color-mix(in_srgb,var(--color-warning)_10%,transparent)] px-5 py-2 shadow-[inset_0_-2px_0_var(--color-warning)]"
        }
      >
        <span className="stamp">on the clock</span>
        <span
          className={
            isMyPick
              ? "font-data text-xl font-semibold leading-tight text-[var(--color-accent)]"
              : "font-data text-xl font-semibold leading-tight text-[var(--color-fg-default)]"
          }
        >
          {isMyPick ? "YOU — on the clock" : onClockTeamName}
        </span>
        <span className="stamp">
          {isMyPick
            ? "your pick — log it below"
            : myNextOverall !== null
              ? `you in ${picksUntilMine} ${picksUntilMine === 1 ? "pick" : "picks"} (p${pad2(myNextOverall)})`
              : "no picks left for you"}
        </span>
      </div>

      {/* spacer + exit */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-4 px-4 py-2">
        <span className="stamp hidden text-right sm:block">
          keep pick number aligned with your draft platform
        </span>
        <EndDraftNightButton
          leagueId={leagueId}
          className="font-data whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-fg-default)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)]"
        />
      </div>
    </header>
  );
}
