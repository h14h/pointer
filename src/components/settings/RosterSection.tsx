"use client";

import { NumericInput } from "@/components/NumericInput";
import { useStore } from "@/store";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
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
  const { leagues, activeLeagueId, setLeagueSettings } = useStore();
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
    setLeagueSettings(next);
  };

  const commitBench = (value: number) => {
    const next = {
      ...leagueSettings,
      roster: {
        ...leagueSettings.roster,
        bench: Math.max(0, Math.round(value || 0)),
      },
    };
    setLeagueSettings(next);
  };

  const commitWeeklyStartLimit = (value: number) => {
    const next = {
      ...leagueSettings,
      weeklyStartLimit: value > 0 ? Math.round(value || 0) : null,
    };
    setLeagueSettings(next);
  };

  const toggleWeeklyStartLimit = () => {
    const next = {
      ...leagueSettings,
      weeklyStartLimit: leagueSettings.weeklyStartLimit == null ? 12 : null,
    };
    setLeagueSettings(next);
  };

  const totalSlots =
    Object.values(leagueSettings.roster.positions).reduce((sum, v) => sum + v, 0) +
    leagueSettings.roster.bench;

  return (
    <div className="font-sans">
      {/* Section header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Roster
          </h2>
          <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
            Set per-team starting slots and reserve capacity.
          </p>
        </div>
        <div className="rounded-md bg-[#111111]/[0.04] px-3 py-1.5 text-xs font-bold tabular-nums text-[#111111]/60 dark:bg-[#e5e5e5]/[0.06] dark:text-[#e5e5e5]/50">
          {totalSlots} slots per team
        </div>
      </div>

      {/* Two-column layout: stacks on mobile, side-by-side from sm up */}
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
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
              />
            ))}
          </NumericInputGroup>
        </div>

        {/* Right column: battery + reserves */}
        <div className="grid content-start gap-6">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42">
              Pitcher Usage
            </div>
            <div className="rounded-lg bg-[#dc2626]/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:bg-[#ef4444]/[0.08]">
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[22rem]">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-[#111111] dark:text-[#e5e5e5]">
                      Weekly start limit
                    </div>
                    <TooltipProvider delayDuration={140}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Weekly start limit help"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#111111]/15 text-[11px] font-bold text-[#111111]/45 transition-colors hover:border-[#111111]/25 hover:text-[#111111]/70 focus-visible:border-[#111111]/25 focus-visible:text-[#111111]/70 focus-visible:outline-none dark:border-[#e5e5e5]/15 dark:text-[#e5e5e5]/45 dark:hover:border-[#e5e5e5]/25 dark:hover:text-[#e5e5e5]/70 dark:focus-visible:border-[#e5e5e5]/25 dark:focus-visible:text-[#e5e5e5]/70"
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
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#111111]/10 pt-4 dark:border-[#e5e5e5]/10">
                <div className="text-sm font-semibold text-[#111111]/65 dark:text-[#e5e5e5]/55">
                  Starts per week
                </div>
                <NumericInput
                  aria-label="Weekly Start Limit"
                  min={1}
                  value={leagueSettings.weeklyStartLimit ?? 12}
                  disabled={leagueSettings.weeklyStartLimit == null}
                  onCommit={commitWeeklyStartLimit}
                  units="starts"
                  className="gap-3"
                  inputClassName={`w-12 text-sm sm:w-14 ${
                    leagueSettings.weeklyStartLimit == null
                      ? "text-[#111111]/35 dark:text-[#e5e5e5]/30"
                      : ""
                  }`}
                />
              </div>
            </div>
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
            />
            {reserveSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={rosterSlotLabels[key]}
                ariaLabel={`Roster ${rosterSlotLabels[key]}`}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
              />
            ))}
          </NumericInputGroup>
        </div>
      </div>
    </div>
  );
}
