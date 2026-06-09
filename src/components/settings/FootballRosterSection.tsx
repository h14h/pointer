"use client";

import { useStore } from "@/store";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
    <div className="font-sans">
      <SectionHeader
        className="mb-8"
        title="Roster"
        description="Set per-team starting slots and reserve capacity. FLEX slots accept RB/WR/TE; Superflex also accepts QB."
        meta={
          <Badge variant="neutral" size="md" className="tabular-nums">
            {totalSlots} slots per team
          </Badge>
        }
      />

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
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
            />
          </NumericInputGroup>
        </div>
      </div>
    </div>
  );
}
