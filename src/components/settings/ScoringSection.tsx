"use client";

import { useCallback, useRef, useState } from "react";
import { NumericInput } from "@/components/NumericInput";
import {
  battingCategories,
  pitchingCategories,
} from "@/components/settings/constants";
import { scoringPresets, presetNames } from "@/lib/presets";
import { useDebouncedCallback } from "@/lib/useDebounce";
import { useStore } from "@/store";
import type { ScoringSettings } from "@/types";

type ScoringTab = "batting" | "pitching";

export function ScoringSection() {
  const {
    scoringSettings,
    setScoringSettings,
    updateBattingScoring,
    updatePitchingScoring,
    projectionGroups,
    activeProjectionGroupId,
    mergeTwoWayRankings,
    setMergeTwoWayRankings,
  } = useStore();
  const [tab, setTab] = useState<ScoringTab>("batting");
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
      <div className="mb-6 flex flex-col gap-4 border-b border-[#111111]/10 pb-5 dark:border-[#333333] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Scoring
          </h2>
          <p className="mt-1 text-sm text-[#111111]/55 dark:text-[#e5e5e5]/45">
            Adjust point weights and control two-way player merge behavior.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
          <div className="grid gap-1 sm:min-w-[190px]">
            <label
              htmlFor="scoring-preset"
              className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40"
              style={{ fontVariant: "small-caps" }}
            >
              Preset
            </label>
            <select
              key={activePresetKey}
              id="scoring-preset"
              defaultValue={activePresetKey}
              ref={presetSelectionRef}
              className="rounded-sm border border-[#111111]/20 bg-white px-2 py-1.5 text-sm text-[#111111] focus:border-[#dc2626] focus:outline-none dark:border-[#333333] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] dark:focus:border-[#ef4444]"
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
            className="rounded-sm bg-[#dc2626] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:bg-[#ef4444] dark:hover:bg-[#dc2626]"
          >
            Apply Preset
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex overflow-hidden rounded-sm border border-[#111111]/20 dark:border-[#333333]">
          <button
            type="button"
            onClick={() => setTab("batting")}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === "batting"
                ? "bg-[#111111] text-white dark:bg-[#e5e5e5] dark:text-[#111111]"
                : "text-[#111111]/60 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/50 dark:hover:bg-[#1a1a1a]"
            }`}
          >
            Batting
          </button>
          <button
            type="button"
            onClick={() => setTab("pitching")}
            className={`border-l border-[#111111]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors dark:border-[#333333] ${
              tab === "pitching"
                ? "bg-[#111111] text-white dark:bg-[#e5e5e5] dark:text-[#111111]"
                : "text-[#111111]/60 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/50 dark:hover:bg-[#1a1a1a]"
            }`}
          >
            Pitching
          </button>
        </div>

        <div
          className={`flex items-center gap-2 text-sm ${
            canMergeTwoWay
              ? "text-[#111111]/70 dark:text-[#e5e5e5]/60"
              : "text-[#111111]/30 dark:text-[#e5e5e5]/20"
          }`}
          title={!canMergeTwoWay ? "Merge two-way requires provided player IDs in both uploads." : undefined}
        >
          <span className="text-xs">Merge two-way</span>
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
            className={`relative inline-flex h-5 w-10 items-center rounded-sm border transition-colors ${
              mergeTwoWayRankings && canMergeTwoWay
                ? "border-[#dc2626] bg-[#dc2626] dark:border-[#ef4444] dark:bg-[#ef4444]"
                : "border-[#111111]/30 bg-transparent dark:border-[#333333]"
            } ${canMergeTwoWay ? "" : "cursor-not-allowed opacity-30"}`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-sm transition-transform ${
                mergeTwoWayRankings && canMergeTwoWay
                  ? "translate-x-6 bg-white"
                  : "translate-x-1 bg-[#111111]/40 dark:bg-[#e5e5e5]/40"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[52rem] grid-cols-1 gap-y-2 sm:gap-y-3 md:grid-cols-[minmax(0,20rem)_minmax(0,20rem)] md:justify-center md:gap-x-14 lg:gap-x-20">
        {tab === "batting"
          ? battingCategories.map(({ key, label }) => (
              <div
                key={key}
                className="grid grid-cols-[3.1rem_max-content] items-center gap-2 border-b border-[#111111]/5 py-2 dark:border-[#333333]/40 sm:gap-3"
              >
                <span className="text-[0.95rem] font-semibold tracking-wide text-[#111111]/78 dark:text-[#e5e5e5]/68 sm:text-base">
                  {key}
                </span>
                <NumericInput
                  units="points"
                  aria-label={`${label} points`}
                  increment={0.5}
                  value={scoringSettings.batting[key]}
                  onCommit={(nextValue) => debouncedUpdateBatting(key, nextValue)}
                  className="gap-1.5"
                  unitsClassName="text-[11px] font-bold uppercase tracking-[0.12em] text-[#111111]/42 dark:text-[#e5e5e5]/38"
                  inputClassName="w-16 text-sm sm:w-20 sm:text-base"
                />
              </div>
            ))
          : pitchingCategories.map(({ key, label }) => (
              <div
                key={key}
                className="grid grid-cols-[3.1rem_max-content] items-center gap-2 border-b border-[#111111]/5 py-2 dark:border-[#333333]/40 sm:gap-3"
              >
                <span className="text-[0.95rem] font-semibold tracking-wide text-[#111111]/78 dark:text-[#e5e5e5]/68 sm:text-base">
                  {key}
                </span>
                <NumericInput
                  units="points"
                  aria-label={`${label} points`}
                  increment={0.5}
                  value={scoringSettings.pitching[key]}
                  onCommit={(nextValue) => debouncedUpdatePitching(key, nextValue)}
                  className="gap-1.5"
                  unitsClassName="text-[11px] font-bold uppercase tracking-[0.12em] text-[#111111]/42 dark:text-[#e5e5e5]/38"
                  inputClassName="w-16 text-sm sm:w-20 sm:text-base"
                />
              </div>
            ))}
      </div>
    </div>
  );
}
