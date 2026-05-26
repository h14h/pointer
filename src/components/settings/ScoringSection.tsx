"use client";

import { useCallback, useEffect, useState } from "react";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
import {
  battingGroups,
  pitchingGroups,
} from "@/components/settings/constants";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { Dropdown } from "@/components/ui/Dropdown";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Toggle } from "@/components/ui/Toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { scoringPresets, presetNames } from "@/lib/league";
import { useDebouncedCallback } from "@/lib/useDebounce";
import { useStore } from "@/store";
import { FootballScoringSection } from "@/components/settings/FootballScoringSection";
import type { ScoringSettings, BaseballScoringSettings } from "@/types";

export function ScoringSection() {
  const {
    leagues,
    activeLeagueId,
    updateLeague,
    projectionGroups,
    activeProjectionGroupId,
    mergeTwoWayRankings,
    setMergeTwoWayRankings,
  } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const scoringSettings = activeLeague?.scoringSettings;

  if (!scoringSettings || "passing" in scoringSettings) {
    return <FootballScoringSection />;
  }

  const activePresetKey =
    presetNames.find((key) => scoringPresets[key].name === scoringSettings.name) ??
    presetNames[0];
  const [selectedPresetKey, setSelectedPresetKey] = useState(activePresetKey);

  useEffect(() => {
    setSelectedPresetKey(activePresetKey);
  }, [activePresetKey]);

  const debouncedUpdateBatting = useDebouncedCallback(
    useCallback(
      (key: keyof BaseballScoringSettings["batting"], value: number) =>
        updateLeague({
          scoringSettings: {
            ...scoringSettings,
            batting: { ...scoringSettings.batting, [key]: value },
          },
        }),
      [updateLeague, scoringSettings]
    ),
    150
  );

  const debouncedUpdatePitching = useDebouncedCallback(
    useCallback(
      (key: keyof BaseballScoringSettings["pitching"], value: number) =>
        updateLeague({
          scoringSettings: {
            ...scoringSettings,
            pitching: { ...scoringSettings.pitching, [key]: value },
          },
        }),
      [updateLeague, scoringSettings]
    ),
    150
  );

  const activeGroup =
    projectionGroups.find((group) => group.id === activeProjectionGroupId) ??
    projectionGroups[0] ??
    null;
  const canMergeTwoWay =
    !!activeGroup &&
    activeGroup.batterIdSource !== null &&
    activeGroup.batterIdSource !== "generated" &&
    activeGroup.pitcherIdSource !== null &&
    activeGroup.pitcherIdSource !== "generated";

  return (
    <div className="font-sans">
      <SectionHeader
        className="mb-8"
        title="Scoring"
        description="Adjust point weights and control two-way player merge behavior."
      />

      {/* Preset controls + merge toggle */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5 sm:max-w-[220px]">
            <FieldLabel>Preset</FieldLabel>
            <Dropdown
              value={selectedPresetKey}
              onChange={setSelectedPresetKey}
              ariaLabel="Scoring preset"
              triggerClassName="h-9"
              menuClassName="min-w-[220px]"
              options={presetNames.map((key) => ({
                value: key,
                label: scoringPresets[key].name,
              }))}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              if ("passing" in scoringPresets[selectedPresetKey]) {
                // Football preset — skip for now
                return;
              }
              updateLeague({ scoringSettings: scoringPresets[selectedPresetKey] });
            }}
          >
            Apply Preset
          </Button>
        </div>

        <div
          className={`flex items-center gap-2.5 ${
            canMergeTwoWay
              ? "text-[#111111]/65 dark:text-[#e5e5e5]/55"
              : "text-[#111111]/45 dark:text-[#e5e5e5]/38"
          }`}
        >
          <span className="text-xs font-medium">Merge two-way</span>
          {!canMergeTwoWay ? (
            <TooltipProvider delayDuration={140}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Why merge two-way is unavailable"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border-soft)] text-[11px] font-bold text-[var(--color-fg-subtle)] transition-colors hover:border-[var(--color-border-default)] hover:text-[var(--color-fg-muted)]"
                  >
                    ?
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  Merge two-way requires provided player IDs in both uploads.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
          <Toggle
            checked={mergeTwoWayRankings}
            aria-disabled={!canMergeTwoWay}
            disabled={!canMergeTwoWay}
            onClick={() => {
              if (canMergeTwoWay) {
                setMergeTwoWayRankings(!mergeTwoWayRankings);
              }
            }}
            className={!canMergeTwoWay ? "bg-[#111111]/15 dark:bg-[#e5e5e5]/15 border-transparent" : ""}
          />
        </div>
      </div>

      {/* Two-column layout: batting left, pitching right */}
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {/* Batting column */}
        <div className="grid content-start gap-6">
          <h3
            className="text-xs font-bold uppercase tracking-widest text-[#111111]/70 dark:text-[#e5e5e5]/60"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Batting
          </h3>
          {battingGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key}
                  ariaLabel={`${label} points`}
                  increment={0.5}
                  value={scoringSettings.batting[key]}
                  onCommit={(v) => debouncedUpdateBatting(key, v)}
                  units="pts"
                  unitsClassName="text-[10px] font-bold uppercase tracking-[0.14em] text-[#111111]/45 dark:text-[#e5e5e5]/38"
                  inputClassName="w-14 text-sm sm:w-16 sm:text-base"
                  numericClassName="gap-1.5"
                />
              ))}
            </NumericInputGroup>
          ))}
        </div>

        {/* Pitching column */}
        <div className="grid content-start gap-6">
          <h3
            className="text-xs font-bold uppercase tracking-widest text-[#111111]/70 dark:text-[#e5e5e5]/60"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Pitching
          </h3>
          {pitchingGroups.map((group) => (
            <NumericInputGroup key={group.label} label={group.label}>
              {group.categories.map(({ key, label }) => (
                <NumericInputRow
                  key={key}
                  label={key}
                  ariaLabel={`${label} points`}
                  increment={0.5}
                  value={scoringSettings.pitching[key]}
                  onCommit={(v) => debouncedUpdatePitching(key, v)}
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
