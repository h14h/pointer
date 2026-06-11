"use client";

import { LedgerRow } from "@/components/ui/LedgerRow";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import {
  pad2,
  slotLabel,
  type MyRosterRow,
  type WireRow,
} from "./model";
import { ResetDraftControl } from "./ResetDraftControl";
import { RosterList } from "./RosterList";

/**
 * Right rail — SYNC CHECK (huge pick number for glancing), MY ROSTER, and
 * THE WIRE (every logged pick, newest first, with undo).
 */
export function Rail({
  overall,
  round,
  pickInRound,
  onClockTeamName,
  isMyPick,
  totalPicks,
  myRoster,
  totalRounds,
  wire,
  canUndo,
  onUndo,
}: {
  overall: number;
  round: number;
  pickInRound: number;
  onClockTeamName: string;
  isMyPick: boolean;
  totalPicks: number;
  myRoster: MyRosterRow[];
  totalRounds: number;
  wire: WireRow[];
  canUndo: boolean;
  onUndo: () => void;
}) {
  return (
    <aside className="flex w-[21rem] flex-none flex-col gap-3 overflow-y-auto pb-12 [scrollbar-width:thin]">
      <Panel as="section" padding="none" className="flex-none">
        <PanelHeader
          title="sync check"
          right={<span className="stamp">{slotLabel(round, pickInRound)}</span>}
        />
        <div className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <span
              className={
                isMyPick
                  ? "font-data text-5xl font-semibold leading-none text-[var(--color-accent)]"
                  : "font-data text-5xl font-semibold leading-none text-[var(--color-warning)]"
              }
            >
              №{overall}
            </span>
            <span
              className={
                isMyPick
                  ? "font-data text-base font-semibold text-[var(--color-accent)]"
                  : "font-data text-base font-semibold text-[var(--color-fg-default)]"
              }
            >
              {isMyPick ? "you are" : onClockTeamName} on the clock
            </span>
          </div>
          <span className="font-data text-xs text-[var(--color-fg-muted)]">
            round {round} · pick {pickInRound} · p{overall} of {totalPicks}
          </span>
          <div className="flex items-baseline justify-between gap-3">
            <span className="stamp">realign if your platform disagrees</span>
            <ResetDraftControl />
          </div>
        </div>
      </Panel>

      <Panel as="section" padding="none" className="flex-none">
        <PanelHeader
          title="my roster"
          right={
            <span className="stamp">
              {myRoster.length}/{totalRounds}
            </span>
          }
        />
        {myRoster.length === 0 ? (
          <p className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
            no picks yet — your selections land here in round order.
          </p>
        ) : (
          <RosterList rows={myRoster} />
        )}
      </Panel>

      <Panel as="section" padding="none" className="flex-none">
        <PanelHeader
          title="the wire"
          right={
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="font-data text-[10px] uppercase tracking-[0.08em] text-[var(--color-warning)] underline underline-offset-2 disabled:cursor-default disabled:opacity-40"
            >
              undo last pick
            </button>
          }
        />
        {wire.length === 0 ? (
          <p className="px-4 py-3 text-xs text-[var(--color-fg-muted)]">
            no picks logged yet — the wire reads newest first.
          </p>
        ) : (
          <div className="py-1">
            {wire.map((row) => (
              <LedgerRow
                key={row.overall}
                className={
                  row.isMine
                    ? "grid grid-cols-[3rem_1fr_auto] gap-2 bg-[color:color-mix(in_srgb,var(--color-accent)_8%,transparent)] py-1"
                    : "grid grid-cols-[3rem_1fr_auto] gap-2 py-1"
                }
              >
                <span className="font-data text-[10px] text-[var(--color-fg-subtle)]">
                  p{pad2(row.overall)}
                </span>
                <span
                  className={
                    row.isMine
                      ? "font-data min-w-0 truncate text-xs text-[var(--color-accent)]"
                      : "font-data min-w-0 truncate text-xs text-[var(--color-fg-default)]"
                  }
                >
                  {row.playerName}
                </span>
                <span className="font-data text-[10px] text-[var(--color-fg-muted)]">
                  → {row.teamAbbrev}
                </span>
              </LedgerRow>
            ))}
          </div>
        )}
      </Panel>
    </aside>
  );
}
