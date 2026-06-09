"use client";

import { useCallback, useEffect, useState } from "react";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
import {
  footballDstGroups,
  footballKickingGroups,
  footballOffenseGroups,
} from "@/components/settings/footballConstants";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Dropdown } from "@/components/ui/Dropdown";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  footballPresetNames,
  footballScoringPresets,
  normalizeFootballConfig,
} from "@/lib/football";
import { useDebouncedCallback } from "@/lib/useDebounce";
import { useStore } from "@/store";
import type { FootballScoringSettings } from "@/types";

const columnHeadingClass =
  "text-xs font-bold uppercase tracking-widest text-[#111111]/70 dark:text-[#e5e5e5]/60";
const columnHeadingStyle = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;

export function FootballScoringSection() {
  const { leagues, activeLeagueId, updateLeague } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const config = normalizeFootballConfig(activeLeague?.football);
  const scoring = config.scoring;

  const activePresetKey =
    footballPresetNames.find((key) => footballScoringPresets[key].name === scoring.name) ??
    footballPresetNames[0];
  const [selectedPresetKey, setSelectedPresetKey] = useState(activePresetKey);

  useEffect(() => {
    setSelectedPresetKey(activePresetKey);
  }, [activePresetKey]);

  const commitScoring = useCallback(
    (next: FootballScoringSettings) => {
      updateLeague({ football: { ...config, scoring: next } });
    },
    [updateLeague, config],
  );

  const debouncedUpdateOffense = useDebouncedCallback(
    useCallback(
      (key: keyof FootballScoringSettings["offense"], value: number) =>
        commitScoring({ ...scoring, offense: { ...scoring.offense, [key]: value } }),
      [commitScoring, scoring],
    ),
    150,
  );

  const debouncedUpdateKicking = useDebouncedCallback(
    useCallback(
      (key: keyof FootballScoringSettings["kicking"], value: number) =>
        commitScoring({ ...scoring, kicking: { ...scoring.kicking, [key]: value } }),
      [commitScoring, scoring],
    ),
    150,
  );

  const debouncedUpdateDst = useDebouncedCallback(
    useCallback(
      (key: keyof FootballScoringSettings["dst"], value: number) =>
        commitScoring({ ...scoring, dst: { ...scoring.dst, [key]: value } }),
      [commitScoring, scoring],
    ),
    150,
  );

  return (
    <div className="font-sans">
      <SectionHeader
        className="mb-8"
        title="Scoring"
        description="Adjust football point weights. Yardage weights are per yard (0.04 = 1 pt per 25 passing yards, 0.1 = 1 pt per 10 rushing/receiving yards)."
      />

      {/* Preset controls */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-1.5 sm:max-w-[220px]">
          <FieldLabel>Preset</FieldLabel>
          <Dropdown
            value={selectedPresetKey}
            onChange={setSelectedPresetKey}
            ariaLabel="Football scoring preset"
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
            commitScoring(footballScoringPresets[selectedPresetKey]);
          }}
        >
          Apply Preset
        </Button>
      </div>

      {/* Two-column layout: offense left, kicking + DST right */}
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="grid content-start gap-6">
          <h3 className={columnHeadingClass} style={columnHeadingStyle}>
            Offense
          </h3>
          {footballOffenseGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key.replace(/_/g, " ")}
                  ariaLabel={`${label} points`}
                  increment={key.endsWith("YDS") ? 0.01 : 0.5}
                  value={scoring.offense[key]}
                  onCommit={(v) => debouncedUpdateOffense(key, v)}
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
          <h3 className={columnHeadingClass} style={columnHeadingStyle}>
            Kicking & Defense
          </h3>
          {footballKickingGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key}
                  ariaLabel={`${label} points`}
                  increment={0.5}
                  value={scoring.kicking[key]}
                  onCommit={(v) => debouncedUpdateKicking(key, v)}
                  units="pts"
                  unitsClassName="text-[10px] font-bold uppercase tracking-[0.14em] text-[#111111]/45 dark:text-[#e5e5e5]/38"
                  inputClassName="w-14 text-sm sm:w-16 sm:text-base"
                  numericClassName="gap-1.5"
                />
              ))}
            </NumericInputGroup>
          ))}
          {footballDstGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key}
                  ariaLabel={`${label} points`}
                  increment={0.5}
                  value={scoring.dst[key]}
                  onCommit={(v) => debouncedUpdateDst(key, v)}
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
