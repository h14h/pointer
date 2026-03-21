"use client";

import { useCallback, useRef } from "react";
import { NumericInputGroup, NumericInputRow } from "@/components/NumericInputGroup";
import {
  battingGroups,
  pitchingGroups,
} from "@/components/settings/constants";
import { scoringPresets, presetNames } from "@/lib/presets";
import { useDebouncedCallback } from "@/lib/useDebounce";
import { useStore } from "@/store";
import type { ScoringSettings } from "@/types";

export function ScoringSection() {
  const {
    leagues,
    activeLeagueId,
    setScoringSettings,
    updateBattingScoring,
    updatePitchingScoring,
    projectionGroups,
    activeProjectionGroupId,
    mergeTwoWayRankings,
    setMergeTwoWayRankings,
  } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const scoringSettings = activeLeague?.scoringSettings;
  const presetSelectionRef = useRef<HTMLSelectElement>(null);
  const activePresetKey =
    presetNames.find((key) => scoringPresets[key].name === scoringSettings.name) ??
    presetNames[0];

  const debouncedUpdateBatting = useDebouncedCallback(
    useCallback(
      (key: keyof ScoringSettings["batting"], value: number) =>
        updateBattingScoring(key, value),
      [updateBattingScoring]
    ),
    150
  );

  const debouncedUpdatePitching = useDebouncedCallback(
    useCallback(
      (key: keyof ScoringSettings["pitching"], value: number) =>
        updatePitchingScoring(key, value),
      [updatePitchingScoring]
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
      {/* Section header */}
      <div className="mb-8">
        <h2
          className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Scoring
        </h2>
        <p className="mt-1 text-sm text-[#111111]/60 dark:text-[#e5e5e5]/50">
          Adjust point weights and control two-way player merge behavior.
        </p>
      </div>

      {/* Preset controls + merge toggle */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5 sm:max-w-[220px]">
            <label
              htmlFor="scoring-preset"
              className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/42"
            >
              Preset
            </label>
            <select
              key={activePresetKey}
              id="scoring-preset"
              defaultValue={activePresetKey}
              ref={presetSelectionRef}
              className="h-9 rounded-md border border-[#111111]/15 bg-white px-2.5 text-sm text-[#111111] transition-colors focus:border-[#dc2626] focus:outline-none dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] dark:focus:border-[#ef4444]"
            >
              {presetNames.map((key) => (
                <option key={key} value={key}>
                  {scoringPresets[key].name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              const presetKey = presetSelectionRef.current?.value ?? activePresetKey;
              setScoringSettings(scoringPresets[presetKey]);
            }}
            className="h-9 rounded-md bg-[#dc2626] px-4 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#b91c1c] dark:bg-[#ef4444] dark:hover:bg-[#dc2626]"
          >
            Apply Preset
          </button>
        </div>

        <div
          className={`flex items-center gap-2.5 ${
            canMergeTwoWay
              ? "text-[#111111]/65 dark:text-[#e5e5e5]/55"
              : "text-[#111111]/45 dark:text-[#e5e5e5]/38"
          }`}
          title={!canMergeTwoWay ? "Merge two-way requires provided player IDs in both uploads." : undefined}
        >
          <span className="text-xs font-medium">Merge two-way</span>
          <button
            type="button"
            role="switch"
            aria-checked={mergeTwoWayRankings}
            aria-disabled={!canMergeTwoWay}
            disabled={!canMergeTwoWay}
            onClick={() => {
              if (canMergeTwoWay) {
                setMergeTwoWayRankings(!mergeTwoWayRankings);
              }
            }}
            className={`relative inline-flex h-[22px] w-10 items-center rounded-full transition-colors ${
              mergeTwoWayRankings && canMergeTwoWay
                ? "bg-[#dc2626] dark:bg-[#ef4444]"
                : "bg-[#111111]/15 dark:bg-[#e5e5e5]/15"
            } ${canMergeTwoWay ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
          >
            <span
              className={`inline-block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform ${
                mergeTwoWayRankings && canMergeTwoWay
                  ? "translate-x-[21px]"
                  : "translate-x-[3px]"
              }`}
            />
          </button>
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
