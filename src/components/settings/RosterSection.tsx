"use client";

import { NumericInput } from "@/components/NumericInput";
import { useStore } from "@/store";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Panel } from "@/components/ui/Panel";
import { Toggle } from "@/components/ui/Toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import {
  catcherSlots,
  extraSlots,
  infieldSlots,
  outfieldSlots,
  pitcherSlots,
  reserveSlots,
  rosterSlotLabels,
} from "@/components/settings/constants";
import type { RosterSlot } from "@/types";

export function RosterSection() {
  const { leagues, activeLeagueId, updateLeague } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const leagueSettings = activeLeague?.leagueSettings;

  const commitRosterSlot = (slot: RosterSlot, value: number) => {
    const next = {
      ...leagueSettings,
      roster: {
        ...leagueSettings.roster,
        positions: {
          ...leagueSettings.roster.positions,
          [slot]: Math.max(0, Math.round(value || 0)),
        },
      },
    };
    updateLeague({ leagueSettings: next });
  };

  const commitBench = (value: number) => {
    const next = {
      ...leagueSettings,
      roster: {
        ...leagueSettings.roster,
        bench: Math.max(0, Math.round(value || 0)),
      },
    };
    updateLeague({ leagueSettings: next });
  };

  const commitWeeklyStartLimit = (value: number) => {
    const next = {
      ...leagueSettings,
      weeklyStartLimit: value > 0 ? Math.round(value || 0) : null,
    };
    updateLeague({ leagueSettings: next });
  };

  const toggleWeeklyStartLimit = () => {
    const next = {
      ...leagueSettings,
      weeklyStartLimit: leagueSettings.weeklyStartLimit == null ? 12 : null,
    };
    updateLeague({ leagueSettings: next });
  };

  const totalSlots =
    Object.values(leagueSettings.roster.positions).reduce((sum, v) => sum + v, 0) +
    leagueSettings.roster.bench;

  return (
    <Panel as="section" padding="none" className="font-sans">
      {/* Header strip: description + slot tally */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--color-border-soft)] px-4 py-3 sm:px-5">
        <p className="text-xs text-[var(--color-fg-muted)]">
          Set per-team starting slots and reserve capacity.
        </p>
        <span className="stamp font-data">{totalSlots} slots per team</span>
      </div>

      {/* Two-column layout: stacks on mobile, side-by-side from sm up */}
      <div className="grid gap-x-8 gap-y-6 p-4 sm:grid-cols-2 sm:p-5">
        {/* Left column: position players */}
        <div className="grid content-start gap-6">
          <NumericInputGroup label="Outfield">
            {outfieldSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={rosterSlotLabels[key]}
                ariaLabel={`Roster ${rosterSlotLabels[key]}`}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
                inputClassName="font-data w-10 text-sm"
              />
            ))}
          </NumericInputGroup>

          <NumericInputGroup label="Infield">
            {infieldSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={rosterSlotLabels[key]}
                ariaLabel={`Roster ${rosterSlotLabels[key]}`}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
                inputClassName="font-data w-10 text-sm"
              />
            ))}
          </NumericInputGroup>

          <NumericInputGroup label="Flex">
            {extraSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={rosterSlotLabels[key]}
                ariaLabel={`Roster ${rosterSlotLabels[key]}`}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
                inputClassName="font-data w-10 text-sm"
              />
            ))}
          </NumericInputGroup>
        </div>

        {/* Right column: battery + reserves */}
        <div className="grid content-start gap-6">
          <div>
            <FieldLabel className="mb-2 block">Pitcher Usage</FieldLabel>
            <Panel tone="accent" padding="md">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[22rem]">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-[var(--color-fg-default)]">
                      Weekly start limit
                    </div>
                    <TooltipProvider delayDuration={140}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Weekly start limit help"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border-soft)] text-[11px] font-bold text-[var(--color-fg-subtle)] transition-colors hover:border-[var(--color-border-default)] hover:text-[var(--color-fg-muted)] focus-visible:border-[var(--color-border-default)] focus-visible:text-[var(--color-fg-muted)] focus-visible:outline-none"
                          >
                            ?
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                        Use this only for leagues that cap pitcher starts per matchup. It shifts
                        some flexible pitcher demand from SP toward RP in PAR.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Toggle
                  checked={leagueSettings.weeklyStartLimit != null}
                  size="md"
                  aria-label="Enable weekly start limit"
                  onClick={toggleWeeklyStartLimit}
                  className="shrink-0"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--color-border-soft)] pt-4">
                <div className="text-sm font-semibold text-[var(--color-fg-muted)]">
                  Starts per week
                </div>
                <NumericInput
                  aria-label="Weekly Start Limit"
                  min={1}
                  value={leagueSettings.weeklyStartLimit ?? 12}
                  disabled={leagueSettings.weeklyStartLimit == null}
                  onCommit={commitWeeklyStartLimit}
                  units="starts"
                  unitsClassName="stamp"
                  className="gap-3"
                  inputClassName={`font-data w-12 text-sm sm:w-14 ${
                    leagueSettings.weeklyStartLimit == null
                      ? "text-[var(--color-fg-subtle)]"
                      : ""
                  }`}
                />
              </div>
            </Panel>
          </div>

          <NumericInputGroup label="Pitchers">
            {pitcherSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={rosterSlotLabels[key]}
                ariaLabel={`Roster ${rosterSlotLabels[key]}`}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
                inputClassName="font-data w-10 text-sm"
              />
            ))}
          </NumericInputGroup>

          <NumericInputGroup label="Catchers">
            {catcherSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={rosterSlotLabels[key]}
                ariaLabel={`Roster ${rosterSlotLabels[key]}`}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
                inputClassName="font-data w-10 text-sm"
              />
            ))}
          </NumericInputGroup>

          <NumericInputGroup label="Reserves">
            <NumericInputRow
              label="Bench"
              ariaLabel="Bench"
              min={0}
              value={leagueSettings.roster.bench}
              onCommit={commitBench}
              inputClassName="font-data w-10 text-sm"
            />
            {reserveSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={rosterSlotLabels[key]}
                ariaLabel={`Roster ${rosterSlotLabels[key]}`}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
                inputClassName="font-data w-10 text-sm"
              />
            ))}
          </NumericInputGroup>
        </div>
      </div>
    </Panel>
  );
}
