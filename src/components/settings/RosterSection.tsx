"use client";

import { useStore } from "@/store";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
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
