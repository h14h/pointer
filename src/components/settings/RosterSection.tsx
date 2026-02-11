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

  return (
    <div className="font-sans">
      <div className="mb-6 border-b border-[#111111]/10 pb-5 dark:border-[#333333]">
        <h2
          className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Roster
        </h2>
        <p className="mt-1 text-sm text-[#111111]/55 dark:text-[#e5e5e5]/45">
          Set per-team starting slots and reserve capacity.
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
          style={{ fontVariant: "small-caps" }}
        >
          Roster
        </span>
        <span className="text-[10px] text-[#111111]/30 dark:text-[#e5e5e5]/20">Per team</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="rounded-sm border border-[#111111]/10 p-4 dark:border-[#333333]">
          <div className="grid gap-4">
            <div>
              <div
                className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
                style={{ fontVariant: "small-caps" }}
              >
                Outfield
              </div>
              <div className="grid grid-cols-3 gap-2">
                {outfieldSlots.map((key) => (
                  <div
                    key={key}
                    className="border-b border-[#111111]/10 px-2 py-2 dark:border-[#333333]/40"
                  >
                    <NumericInput
                      aria-label={`Roster ${rosterSlotLabels[key]}`}
                      units={rosterSlotLabels[key]}
                      increment={1}
                      min={0}
                      value={leagueSettings.roster.positions[key] ?? 0}
                      onCommit={(nextValue) => commitRosterSlot(key, nextValue)}
                      className="w-full gap-1"
                      inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div
                className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
                style={{ fontVariant: "small-caps" }}
              >
                Infield
              </div>
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                {infieldSlots.map((key) => (
                  <div
                    key={key}
                    className="border-b border-[#111111]/10 px-2 py-2 dark:border-[#333333]/40"
                  >
                    <NumericInput
                      aria-label={`Roster ${rosterSlotLabels[key]}`}
                      units={rosterSlotLabels[key]}
                      increment={1}
                      min={0}
                      value={leagueSettings.roster.positions[key] ?? 0}
                      onCommit={(nextValue) => commitRosterSlot(key, nextValue)}
                      className="w-full gap-1"
                      inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div
                className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
                style={{ fontVariant: "small-caps" }}
              >
                Flex
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {extraSlots.map((key) => (
                  <div
                    key={key}
                    className="border-b border-[#111111]/10 px-2 py-2 dark:border-[#333333]/40"
                  >
                    <NumericInput
                      aria-label={`Roster ${rosterSlotLabels[key]}`}
                      units={rosterSlotLabels[key]}
                      increment={1}
                      min={0}
                      value={leagueSettings.roster.positions[key] ?? 0}
                      onCommit={(nextValue) => commitRosterSlot(key, nextValue)}
                      className="w-full gap-1"
                      inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid w-fit min-w-[160px] content-start gap-3 justify-self-end rounded-sm border border-[#111111]/10 p-3 dark:border-[#333333]">
          <div
            className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
            style={{ fontVariant: "small-caps" }}
          >
            Pitchers
          </div>
          {pitcherSlots.map((key) => (
            <div key={key} className="border-b border-[#111111]/10 px-2 py-2 dark:border-[#333333]/40">
              <NumericInput
                aria-label={`Roster ${rosterSlotLabels[key]}`}
                units={rosterSlotLabels[key]}
                increment={1}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(nextValue) => commitRosterSlot(key, nextValue)}
                className="gap-1"
                inputClassName="w-10 text-sm sm:w-12 sm:text-base"
              />
            </div>
          ))}

          <div
            className="pt-1 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
            style={{ fontVariant: "small-caps" }}
          >
            Catchers
          </div>
          {catcherSlots.map((key) => (
            <div key={key} className="border-b border-[#111111]/10 px-2 py-2 dark:border-[#333333]/40">
              <NumericInput
                aria-label={`Roster ${rosterSlotLabels[key]}`}
                units={rosterSlotLabels[key]}
                increment={1}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(nextValue) => commitRosterSlot(key, nextValue)}
                className="gap-1"
                inputClassName="w-10 text-sm sm:w-12 sm:text-base"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-sm border border-[#111111]/10 p-3 dark:border-[#333333]">
        <div
          className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
          style={{ fontVariant: "small-caps" }}
        >
          Reserves
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="border-b border-[#111111]/10 px-3 py-2 dark:border-[#333333]/40">
            <NumericInput
              aria-label="Bench"
              units="Bench"
              increment={1}
              min={0}
              value={leagueSettings.roster.bench}
              onCommit={commitBench}
              className="w-full"
              inputClassName="w-10 text-sm sm:w-12 sm:text-base"
            />
          </div>
          {reserveSlots.map((key) => (
            <div key={key} className="border-b border-[#111111]/10 px-3 py-2 dark:border-[#333333]/40">
              <NumericInput
                aria-label={`Roster ${rosterSlotLabels[key]}`}
                units={rosterSlotLabels[key]}
                increment={1}
                min={0}
                value={leagueSettings.roster.positions[key] ?? 0}
                onCommit={(nextValue) => commitRosterSlot(key, nextValue)}
                className="w-full"
                inputClassName="w-10 text-sm sm:w-12 sm:text-base"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
