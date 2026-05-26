"use client";

import { useStore } from "@/store";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  footballRosterSlotLabels,
  footballRosterGroups,
} from "@/components/settings/footballConstants";
import type { FootballRosterSlot } from "@/types";

export function FootballRosterSection() {
  const { leagues, activeLeagueId, updateLeague } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const leagueSettings = activeLeague?.leagueSettings;

  if (!leagueSettings) {
    return null;
  }

  const commitRosterSlot = (slot: FootballRosterSlot, value: number) => {
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

  const totalSlots =
    Object.values(leagueSettings.roster.positions).reduce((sum, v) => sum + v, 0) +
    leagueSettings.roster.bench;

  return (
    <div className="font-sans">
      <SectionHeader
        className="mb-8"
        title="Roster"
        description="Set per-team starting slots and reserve capacity."
        meta={<Badge variant="neutral" size="md" className="tabular-nums">{totalSlots} slots per team</Badge>}
      />

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="grid content-start gap-6">
          {footballRosterGroups.slice(0, 1).map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.slots.map((slot) => (
                <NumericInputRow
                  key={slot}
                  label={footballRosterSlotLabels[slot]}
                  ariaLabel={`Roster ${footballRosterSlotLabels[slot]}`}
                  min={0}
                  value={leagueSettings.roster.positions[slot] ?? 0}
                  onCommit={(v) => commitRosterSlot(slot, v)}
                />
              ))}
            </NumericInputGroup>
          ))}
        </div>

        <div className="grid content-start gap-6">
          {footballRosterGroups.slice(1).map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.slots.map((slot) => (
                <NumericInputRow
                  key={slot}
                  label={footballRosterSlotLabels[slot]}
                  ariaLabel={`Roster ${footballRosterSlotLabels[slot]}`}
                  min={0}
                  value={leagueSettings.roster.positions[slot] ?? 0}
                  onCommit={(v) => commitRosterSlot(slot, v)}
                />
              ))}
            </NumericInputGroup>
          ))}
        </div>
      </div>
    </div>
  );
}
