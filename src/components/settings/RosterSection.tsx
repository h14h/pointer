"use client";

import { useStore } from "@/store";
import { NumericInput } from "@/components/NumericInput";
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

function SlotRow({
  slot,
  value,
  onCommit,
}: {
  slot: RosterSlot;
  value: number;
  onCommit: (slot: RosterSlot, value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#111111]/[0.10] py-2.5 last:border-0 dark:border-[#e5e5e5]/[0.08]">
      <span className="text-sm font-semibold text-[#111111]/65 dark:text-[#e5e5e5]/55">
        {rosterSlotLabels[slot]}
      </span>
      <NumericInput
        aria-label={`Roster ${rosterSlotLabels[slot]}`}
        increment={1}
        min={0}
        value={value}
        onCommit={(nextValue) => onCommit(slot, nextValue)}
        inputClassName="w-10 text-sm"
      />
    </div>
  );
}

function SlotGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42">
        {label}
      </div>
      <div className="rounded-lg bg-[#111111]/[0.02] px-3 dark:bg-[#e5e5e5]/[0.03]">
        {children}
      </div>
    </div>
  );
}

export function RosterSection() {
  const { leagueSettings, setLeagueSettings } = useStore();

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
          <SlotGroup label="Outfield">
            {outfieldSlots.map((key) => (
              <SlotRow
                key={key}
                slot={key}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={commitRosterSlot}
              />
            ))}
          </SlotGroup>

          <SlotGroup label="Infield">
            {infieldSlots.map((key) => (
              <SlotRow
                key={key}
                slot={key}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={commitRosterSlot}
              />
            ))}
          </SlotGroup>

          <SlotGroup label="Flex">
            {extraSlots.map((key) => (
              <SlotRow
                key={key}
                slot={key}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={commitRosterSlot}
              />
            ))}
          </SlotGroup>
        </div>

        {/* Right column: battery + reserves */}
        <div className="grid content-start gap-6">
          <SlotGroup label="Pitchers">
            {pitcherSlots.map((key) => (
              <SlotRow
                key={key}
                slot={key}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={commitRosterSlot}
              />
            ))}
          </SlotGroup>

          <SlotGroup label="Catchers">
            {catcherSlots.map((key) => (
              <SlotRow
                key={key}
                slot={key}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={commitRosterSlot}
              />
            ))}
          </SlotGroup>

          <SlotGroup label="Reserves">
            <div className="flex items-center justify-between gap-3 border-b border-[#111111]/[0.10] py-2.5 dark:border-[#e5e5e5]/[0.08]">
              <span className="text-sm font-semibold text-[#111111]/65 dark:text-[#e5e5e5]/55">
                Bench
              </span>
              <NumericInput
                aria-label="Bench"
                increment={1}
                min={0}
                value={leagueSettings.roster.bench}
                onCommit={commitBench}
                inputClassName="w-10 text-sm"
              />
            </div>
            {reserveSlots.map((key) => (
              <SlotRow
                key={key}
                slot={key}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={commitRosterSlot}
              />
            ))}
          </SlotGroup>
        </div>
      </div>
    </div>
  );
}
