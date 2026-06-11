"use client";

import { useStore } from "@/store";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
import { Panel } from "@/components/ui/Panel";
import {
  footballFlexSlots,
  footballRosterSlotLabels,
  footballSpecialSlots,
  footballStarterSlots,
} from "@/components/settings/footballConstants";
import { normalizeFootballConfig } from "@/lib/football";
import type { FootballRosterSlot } from "@/types";

export function FootballRosterSection() {
  const { leagues, activeLeagueId, updateLeague } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const config = normalizeFootballConfig(activeLeague?.football);
  const roster = config.roster;

  const commitRosterSlot = (slot: FootballRosterSlot, value: number) => {
    updateLeague({
      football: {
        ...config,
        roster: {
          ...roster,
          positions: {
            ...roster.positions,
            [slot]: Math.max(0, Math.round(value || 0)),
          },
        },
      },
    });
  };

  const commitBench = (value: number) => {
    updateLeague({
      football: {
        ...config,
        roster: { ...roster, bench: Math.max(0, Math.round(value || 0)) },
      },
    });
  };

  const totalSlots =
    Object.values(roster.positions).reduce((sum, v) => sum + v, 0) + roster.bench;

  return (
    <Panel as="section" padding="none" className="font-sans">
      {/* Header strip: description + slot tally */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--color-border-soft)] px-4 py-3 sm:px-5">
        <p className="text-xs text-[var(--color-fg-muted)]">
          Set per-team starting slots and reserve capacity. FLEX slots accept RB/WR/TE;
          Superflex also accepts QB.
        </p>
        <span className="stamp font-data">{totalSlots} slots per team</span>
      </div>

      <div className="grid gap-x-8 gap-y-6 p-4 sm:grid-cols-2 sm:p-5">
        <div className="grid content-start gap-6">
          <NumericInputGroup label="Starters">
            {footballStarterSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={footballRosterSlotLabels[key]}
                ariaLabel={`Roster ${footballRosterSlotLabels[key]}`}
                min={0}
                value={roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
                inputClassName="font-data w-10 text-sm"
              />
            ))}
          </NumericInputGroup>

          <NumericInputGroup label="Flex">
            {footballFlexSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={footballRosterSlotLabels[key]}
                ariaLabel={`Roster ${footballRosterSlotLabels[key]}`}
                min={0}
                value={roster.positions[key] ?? 0}
                onCommit={(v) => commitRosterSlot(key, v)}
                inputClassName="font-data w-10 text-sm"
              />
            ))}
          </NumericInputGroup>
        </div>

        <div className="grid content-start gap-6">
          <NumericInputGroup label="Special Teams">
            {footballSpecialSlots.map((key) => (
              <NumericInputRow
                key={key}
                label={footballRosterSlotLabels[key]}
                ariaLabel={`Roster ${footballRosterSlotLabels[key]}`}
                min={0}
                value={roster.positions[key] ?? 0}
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
              value={roster.bench}
              onCommit={commitBench}
              inputClassName="font-data w-10 text-sm"
            />
          </NumericInputGroup>
        </div>
      </div>
    </Panel>
  );
}
