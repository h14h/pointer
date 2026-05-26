"use client";

import { useCallback, useEffect, useState } from "react";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
import {
  footballPassingGroups,
  footballRushingGroups,
  footballReceivingGroups,
  footballMiscGroups,
  footballScoringPresets,
  footballPresetNames,
} from "@/components/settings/footballConstants";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Dropdown } from "@/components/ui/Dropdown";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useDebouncedCallback } from "@/lib/useDebounce";
import { useStore } from "@/store";
import type { FootballScoringSettings } from "@/types";

export function FootballScoringSection() {
  const { leagues, activeLeagueId, updateLeague } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const scoringSettings = activeLeague?.scoringSettings as FootballScoringSettings | undefined;

  if (!scoringSettings || !("passing" in scoringSettings)) {
    return null;
  }

  const activePresetKey =
    footballPresetNames.find((key) => footballScoringPresets[key].name === scoringSettings.name) ??
    footballPresetNames[0];
  const [selectedPresetKey, setSelectedPresetKey] = useState(activePresetKey);

  useEffect(() => {
    setSelectedPresetKey(activePresetKey);
  }, [activePresetKey]);

  const debouncedUpdatePassing = useDebouncedCallback(
    useCallback(
      (key: keyof FootballScoringSettings["passing"], value: number) =>
        updateLeague({
          scoringSettings: {
            ...scoringSettings,
            passing: { ...scoringSettings.passing, [key]: value },
          },
        }),
      [updateLeague, scoringSettings]
    ),
    150
  );

  const debouncedUpdateRushing = useDebouncedCallback(
    useCallback(
      (key: keyof FootballScoringSettings["rushing"], value: number) =>
        updateLeague({
          scoringSettings: {
            ...scoringSettings,
            rushing: { ...scoringSettings.rushing, [key]: value },
          },
        }),
      [updateLeague, scoringSettings]
    ),
    150
  );

  const debouncedUpdateReceiving = useDebouncedCallback(
    useCallback(
      (key: keyof FootballScoringSettings["receiving"], value: number) =>
        updateLeague({
          scoringSettings: {
            ...scoringSettings,
            receiving: { ...scoringSettings.receiving, [key]: value },
          },
        }),
      [updateLeague, scoringSettings]
    ),
    150
  );

  const debouncedUpdateMisc = useDebouncedCallback(
    useCallback(
      (key: keyof FootballScoringSettings["misc"], value: number) =>
        updateLeague({
          scoringSettings: {
            ...scoringSettings,
            misc: { ...scoringSettings.misc, [key]: value },
          },
        }),
      [updateLeague, scoringSettings]
    ),
    150
  );

  return (
    <div className="font-sans">
      <SectionHeader
        className="mb-8"
        title="Scoring"
        description="Adjust point weights for passing, rushing, receiving, and misc categories."
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-1.5 sm:max-w-[220px]">
          <FieldLabel>Preset</FieldLabel>
          <Dropdown
            value={selectedPresetKey}
            onChange={setSelectedPresetKey}
            ariaLabel="Scoring preset"
            triggerClassName="h-9"
            menuClassName="min-w-[220px]"
            options={footballPresetNames.map((key) => ({
              value: key,
              label: footballScoringPresets[key].name,
            }))}
          />
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            updateLeague({ scoringSettings: footballScoringPresets[selectedPresetKey] });
          }}
        >
          Apply Preset
        </Button>
      </div>

      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="grid content-start gap-6">
          <h3
            className="text-xs font-bold uppercase tracking-widest text-[#111111]/70 dark:text-[#e5e5e5]/60"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Passing &amp; Rushing
          </h3>
          {footballPassingGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key}
                  ariaLabel={`${label} points`}
                  increment={0.5}
                  value={scoringSettings.passing[key]}
                  onCommit={(v) => debouncedUpdatePassing(key, v)}
                  units="pts"
                  unitsClassName="text-[10px] font-bold uppercase tracking-[0.14em] text-[#111111]/45 dark:text-[#e5e5e5]/38"
                  inputClassName="w-14 text-sm sm:w-16 sm:text-base"
                  numericClassName="gap-1.5"
                />
              ))}
            </NumericInputGroup>
          ))}

          {footballRushingGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key}
                  ariaLabel={`${label} points`}
                  increment={0.5}
                  value={scoringSettings.rushing[key]}
                  onCommit={(v) => debouncedUpdateRushing(key, v)}
                  units="pts"
                  unitsClassName="text-[10px] font-bold uppercase tracking-[0.14em] text-[#111111]/45 dark:text-[#e5e5e5]/38"
                  inputClassName="w-14 text-sm sm:w-16 sm:text-base"
                  numericClassName="gap-1.5"
                />
              ))}
            </NumericInputGroup>
          ))}
        </div>

        <div className="grid content-start gap-6">
          <h3
            className="text-xs font-bold uppercase tracking-widest text-[#111111]/70 dark:text-[#e5e5e5]/60"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Receiving &amp; Misc
          </h3>
          {footballReceivingGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key}
                  ariaLabel={`${label} points`}
                  increment={0.5}
                  value={scoringSettings.receiving[key]}
                  onCommit={(v) => debouncedUpdateReceiving(key, v)}
                  units="pts"
                  unitsClassName="text-[10px] font-bold uppercase tracking-[0.14em] text-[#111111]/45 dark:text-[#e5e5e5]/38"
                  inputClassName="w-14 text-sm sm:w-16 sm:text-base"
                  numericClassName="gap-1.5"
                />
              ))}
            </NumericInputGroup>
          ))}

          {footballMiscGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key}
                  ariaLabel={`${label} points`}
                  increment={0.5}
                  value={scoringSettings.misc[key]}
                  onCommit={(v) => debouncedUpdateMisc(key, v)}
                  units="pts"
                  unitsClassName="text-[10px] font-bold uppercase tracking-[0.14em] text-[#111111]/45 dark:text-[#e5e5e5]/38"
                  inputClassName="w-14 text-sm sm:w-16 sm:text-base"
                  numericClassName="gap-1.5"
                />
              ))}
            </NumericInputGroup>
          ))}
        </div>
      </div>
    </div>
  );
}
