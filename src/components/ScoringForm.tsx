"use client";

import { useState, useCallback, useEffect } from "react";
import { useStore } from "@/store";
import { scoringPresets, presetNames } from "@/lib/presets";
import { useDebouncedCallback } from "@/lib/useDebounce";
import { NumericInput } from "@/components/NumericInput";
import type { ScoringSettings, RosterSlot, LeagueSettings } from "@/types";

interface ScoringFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "batting" | "pitching";

const battingCategories: { key: keyof ScoringSettings["batting"]; label: string }[] = [
  { key: "H", label: "Hits (H) - all types" },
  { key: "1B", label: "Singles (1B)" },
  { key: "2B", label: "Doubles (2B)" },
  { key: "3B", label: "Triples (3B)" },
  { key: "HR", label: "Home Runs (HR)" },
  { key: "R", label: "Runs (R)" },
  { key: "RBI", label: "RBI" },
  { key: "BB", label: "Walks (BB)" },
  { key: "HBP", label: "Hit By Pitch (HBP)" },
  { key: "SO", label: "Strikeouts (SO)" },
  { key: "SB", label: "Stolen Bases (SB)" },
  { key: "CS", label: "Caught Stealing (CS)" },
  { key: "SF", label: "Sac Flies (SF)" },
  { key: "GDP", label: "GIDP" },
];

const pitchingCategories: { key: keyof ScoringSettings["pitching"]; label: string }[] = [
  { key: "IP", label: "Innings Pitched (IP)" },
  { key: "SO", label: "Strikeouts (SO)" },
  { key: "H", label: "Hits Allowed (H)" },
  { key: "ER", label: "Earned Runs (ER)" },
  { key: "HR", label: "HR Allowed (HR)" },
  { key: "BB", label: "Walks Allowed (BB)" },
  { key: "HBP", label: "Hit Batters (HBP)" },
  { key: "W", label: "Wins (W)" },
  { key: "L", label: "Losses (L)" },
  { key: "QS", label: "Quality Starts (QS)" },
  { key: "SV", label: "Saves (SV)" },
  { key: "HLD", label: "Holds (HLD)" },
  { key: "BS", label: "Blown Saves (BS)" },
  { key: "CG", label: "Complete Games (CG)" },
  { key: "ShO", label: "Shutouts (ShO)" },
];

export function ScoringForm({ isOpen, onClose }: ScoringFormProps) {
  const {
    scoringSettings,
    setScoringSettings,
    updateBattingScoring,
    updatePitchingScoring,
    leagueSettings,
    setLeagueSettings,
    projectionGroups,
    activeProjectionGroupId,
    mergeTwoWayRankings,
    setMergeTwoWayRankings,
  } = useStore();
  const [tab, setTab] = useState<Tab>("batting");
  const [presetSelection, setPresetSelection] = useState<string>(presetNames[0]);
  const [localLeagueSettings, setLocalLeagueSettings] =
    useState<LeagueSettings>(leagueSettings);
  const [draggingTeamIndex, setDraggingTeamIndex] = useState<number | null>(null);
  const [dragOverTeamIndex, setDragOverTeamIndex] = useState<number | null>(null);
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
  const mergeHint = "Merge two-way requires provided player IDs in both uploads.";
  const rosterSlotLabels: Record<RosterSlot, string> = {
    C: "C",
    "1B": "1B",
    "2B": "2B",
    "3B": "3B",
    SS: "SS",
    LF: "LF",
    CF: "CF",
    RF: "RF",
    DH: "DH",
    CI: "CI",
    MI: "MI",
    IF: "IF",
    OF: "OF",
    UTIL: "UTIL",
    SP: "SP",
    RP: "RP",
    P: "P",
    IL: "IL",
    NA: "NA",
  };
  const outfieldSlots: RosterSlot[] = ["LF", "CF", "RF"];
  const infieldSlots: RosterSlot[] = ["3B", "SS", "2B", "1B"];
  const extraSlots: RosterSlot[] = ["OF", "CI", "MI", "IF", "UTIL", "DH"];
  const pitcherSlots: RosterSlot[] = ["SP", "RP", "P"];
  const catcherSlots: RosterSlot[] = ["C"];
  const reserveSlots: RosterSlot[] = ["IL", "NA"];

  const normalizeLocalLeagueSettings = (input: LeagueSettings): LeagueSettings => {
    const nextNames = [...input.teamNames];
    let clampedSize = Math.min(20, Math.max(2, nextNames.length));
    if (nextNames.length < clampedSize) {
      for (let i = nextNames.length; i < clampedSize; i += 1) {
        nextNames.push(`Team ${i + 1}`);
      }
    } else if (nextNames.length > clampedSize) {
      nextNames.length = clampedSize;
    }
    return {
      ...input,
      leagueSize: clampedSize,
      teamNames: nextNames,
    };
  };

  const debouncedUpdateLeague = useDebouncedCallback(
    useCallback((next: LeagueSettings) => setLeagueSettings(next), [setLeagueSettings]),
    150
  );

  const handleRosterChange = (slot: RosterSlot, value: number) => {
    const next = {
      ...localLeagueSettings,
      roster: {
        ...localLeagueSettings.roster,
        positions: {
          ...localLeagueSettings.roster.positions,
          [slot]: Math.max(0, Math.round(value || 0)),
        },
      },
    };
    setLocalLeagueSettings(next);
    debouncedUpdateLeague(next);
  };

  const updateTeams = (nextNames: string[]) => {
    const next = normalizeLocalLeagueSettings({
      ...localLeagueSettings,
      teamNames: nextNames,
      leagueSize: nextNames.length,
    });
    setLocalLeagueSettings(next);
    debouncedUpdateLeague(next);
  };

  const handleAddTeamBelow = (index: number) => {
    if (localLeagueSettings.teamNames.length >= 20) return;
    const nextNames = [...localLeagueSettings.teamNames];
    nextNames.splice(index + 1, 0, `Team ${nextNames.length + 1}`);
    updateTeams(nextNames);
  };

  const handleRemoveTeamAt = (index: number) => {
    if (localLeagueSettings.teamNames.length <= 2) return;
    const nextNames = localLeagueSettings.teamNames.filter((_, i) => i !== index);
    updateTeams(nextNames);
  };

  const handleMoveTeam = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= localLeagueSettings.teamNames.length) return;
    const nextNames = [...localLeagueSettings.teamNames];
    const [moved] = nextNames.splice(index, 1);
    nextNames.splice(nextIndex, 0, moved);
    updateTeams(nextNames);
  };
  const handleMoveTeamToIndex = (from: number, to: number) => {
    if (from === to) return;
    const nextNames = [...localLeagueSettings.teamNames];
    const [moved] = nextNames.splice(from, 1);
    nextNames.splice(to, 0, moved);
    updateTeams(nextNames);
  };

  const handleBenchChange = (value: number) => {
    const next = {
      ...localLeagueSettings,
      roster: {
        ...localLeagueSettings.roster,
        bench: Math.max(0, Math.round(value || 0)),
      },
    };
    setLocalLeagueSettings(next);
    debouncedUpdateLeague(next);
  };

  const handleTeamNameChange = (index: number, value: string) => {
    const nextNames = [...localLeagueSettings.teamNames];
    nextNames[index] = value;
    const next = normalizeLocalLeagueSettings({
      ...localLeagueSettings,
      teamNames: nextNames,
      leagueSize: nextNames.length,
    });
    setLocalLeagueSettings(next);
    debouncedUpdateLeague(next);
  };

  // Debounce scoring updates to prevent excessive recalculations
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

  const handlePreset = (presetKey: string) => {
    const preset = scoringPresets[presetKey];
    if (preset) {
      setScoringSettings(preset);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setLocalLeagueSettings(leagueSettings);
  }, [isOpen, leagueSettings]);

  useEffect(() => {
    if (!isOpen) return;
    const match =
      presetNames.find((key) => scoringPresets[key].name === scoringSettings.name) ??
      presetNames[0];
    setPresetSelection(match);
  }, [isOpen, scoringSettings.name]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/20 dark:bg-black/60">
      <div className="relative mx-0 h-full w-full max-w-none rounded-none border border-[#111111]/10 dark:border-[#333333] bg-white dark:bg-[#111111] p-3 pb-0 overflow-hidden flex flex-col font-sans sm:mx-4 sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-sm sm:px-0 sm:pt-0 sm:pb-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scoring modal"
          className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center text-[#111111]/50 dark:text-[#e5e5e5]/40 hover:text-[#111111] dark:hover:text-[#e5e5e5] transition-colors sm:right-6 sm:top-6"
        >
          <span className="text-xl leading-none">&times;</span>
        </button>
        <div className="border-b border-[#111111]/10 dark:border-[#333333] px-4 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="pr-12">
              <h2 className="text-xl font-bold text-[#111111] dark:text-[#e5e5e5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Scoring & League</h2>
              <p className="mt-1 text-sm text-[#111111]/50 dark:text-[#e5e5e5]/40">
                Tune scoring weights, roster sizes, and draft order.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <div className="grid gap-1 sm:min-w-[180px]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>Preset</span>
                <select
                  value={presetSelection}
                  onChange={(e) => setPresetSelection(e.target.value)}
                  className="w-full rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-2 py-1.5 text-sm text-[#111111] dark:text-[#e5e5e5] focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none sm:w-auto"
                >
                  {presetNames.map((key) => (
                    <option key={key} value={key}>
                      {scoringPresets[key].name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handlePreset(presetSelection)}
                className="w-full rounded-sm bg-[#dc2626] dark:bg-[#ef4444] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:hover:bg-[#dc2626] sm:w-auto"
              >
                Apply Preset
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-0 sm:px-8">
          <div className="py-6 border-b border-[#111111]/10 dark:border-[#333333]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111111] dark:text-[#e5e5e5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>Scoring</h3>
                <p className="text-xs text-[#111111]/40 dark:text-[#e5e5e5]/30">Set points per stat.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex border border-[#111111]/20 dark:border-[#333333] rounded-sm overflow-hidden">
                  <button
                    onClick={() => setTab("batting")}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors ${
                      tab === "batting"
                        ? "bg-[#111111] dark:bg-[#e5e5e5] text-white dark:text-[#111111]"
                        : "text-[#111111]/60 dark:text-[#e5e5e5]/50 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
                    }`}
                  >
                    Batting
                  </button>
                  <button
                    onClick={() => setTab("pitching")}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors border-l border-[#111111]/20 dark:border-[#333333] ${
                      tab === "pitching"
                        ? "bg-[#111111] dark:bg-[#e5e5e5] text-white dark:text-[#111111]"
                        : "text-[#111111]/60 dark:text-[#e5e5e5]/50 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
                    }`}
                  >
                    Pitching
                  </button>
                </div>
                <div
                  className={`flex items-center gap-2 text-sm ${
                    canMergeTwoWay ? "text-[#111111]/70 dark:text-[#e5e5e5]/60" : "text-[#111111]/30 dark:text-[#e5e5e5]/20"
                  }`}
                  title={!canMergeTwoWay ? mergeHint : undefined}
                >
                  <span className="text-xs">Merge two-way</span>
                  <button
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
                        ? "border-[#dc2626] dark:border-[#ef4444] bg-[#dc2626] dark:bg-[#ef4444]"
                        : "border-[#111111]/30 dark:border-[#333333] bg-transparent"
                    } ${canMergeTwoWay ? "" : "opacity-30 cursor-not-allowed"}`}
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

          <div className="py-6">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-[#111111] dark:text-[#e5e5e5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>League & Draft</h3>
              <p className="text-xs text-[#111111]/40 dark:text-[#e5e5e5]/30">Roster sizes and draft order.</p>
            </div>

            <div className="grid gap-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                    Roster
                  </span>
                  <span className="text-[10px] text-[#111111]/30 dark:text-[#e5e5e5]/20">Per team</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="border border-[#111111]/10 dark:border-[#333333] rounded-sm p-4">
                    <div className="grid gap-4">
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
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
                              value={localLeagueSettings.roster.positions[key] ?? 0}
                              onCommit={(nextValue) => handleRosterChange(key, nextValue)}
                              className="w-full gap-1"
                              inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                            />
                          </div>
                        ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
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
                              value={localLeagueSettings.roster.positions[key] ?? 0}
                              onCommit={(nextValue) => handleRosterChange(key, nextValue)}
                              className="w-full gap-1"
                              inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                            />
                          </div>
                        ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
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
                              value={localLeagueSettings.roster.positions[key] ?? 0}
                              onCommit={(nextValue) => handleRosterChange(key, nextValue)}
                              className="w-full gap-1"
                              inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                            />
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid w-fit min-w-[160px] content-start gap-3 justify-self-end border border-[#111111]/10 dark:border-[#333333] rounded-sm p-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                      Pitchers
                    </div>
                    {pitcherSlots.map((key) => (
                      <div
                        key={key}
                        className="border-b border-[#111111]/10 px-2 py-2 dark:border-[#333333]/40"
                      >
                        <NumericInput
                          aria-label={`Roster ${rosterSlotLabels[key]}`}
                          units={rosterSlotLabels[key]}
                          increment={1}
                          min={0}
                          value={localLeagueSettings.roster.positions[key] ?? 0}
                          onCommit={(nextValue) => handleRosterChange(key, nextValue)}
                          className="gap-1"
                          inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                        />
                      </div>
                    ))}
                    <div className="pt-1 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                      Catchers
                    </div>
                    {catcherSlots.map((key) => (
                      <div
                        key={key}
                        className="border-b border-[#111111]/10 px-2 py-2 dark:border-[#333333]/40"
                      >
                        <NumericInput
                          aria-label={`Roster ${rosterSlotLabels[key]}`}
                          units={rosterSlotLabels[key]}
                          increment={1}
                          min={0}
                          value={localLeagueSettings.roster.positions[key] ?? 0}
                          onCommit={(nextValue) => handleRosterChange(key, nextValue)}
                          className="gap-1"
                          inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-sm border border-[#111111]/10 p-3 dark:border-[#333333]">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                    Reserves
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="border-b border-[#111111]/10 px-3 py-2 dark:border-[#333333]/40">
                      <NumericInput
                        aria-label="Bench"
                        units="Bench"
                        increment={1}
                        min={0}
                        value={localLeagueSettings.roster.bench}
                        onCommit={(nextValue) => handleBenchChange(nextValue)}
                        className="w-full"
                        inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                      />
                    </div>
                    {reserveSlots.map((key) => (
                      <div
                        key={key}
                        className="border-b border-[#111111]/10 px-3 py-2 dark:border-[#333333]/40"
                      >
                        <NumericInput
                          aria-label={`Roster ${rosterSlotLabels[key]}`}
                          units={rosterSlotLabels[key]}
                          increment={1}
                          min={0}
                          value={localLeagueSettings.roster.positions[key] ?? 0}
                          onCommit={(nextValue) => handleRosterChange(key, nextValue)}
                          className="w-full"
                          inputClassName="w-10 text-sm sm:w-12 sm:text-base"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                    Teams ({localLeagueSettings.teamNames.length})
                  </span>
                  <span className="text-[10px] text-[#111111]/30 dark:text-[#e5e5e5]/20">
                    Order here sets draft order
                  </span>
                </div>
                <div className="grid gap-2">
                  {localLeagueSettings.teamNames.map((name, index) => (
                    <div key={`team-${index}`} className="flex flex-wrap items-center gap-3">
                      <span className="w-10 text-xs font-bold text-[#111111]/40 dark:text-[#e5e5e5]/30">
                        T{index + 1}
                      </span>
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingTeamIndex(index);
                        }}
                        onDragEnd={() => {
                          setDraggingTeamIndex(null);
                          setDragOverTeamIndex(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverTeamIndex !== index) {
                            setDragOverTeamIndex(index);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingTeamIndex === null) return;
                          handleMoveTeamToIndex(draggingTeamIndex, index);
                          setDraggingTeamIndex(null);
                          setDragOverTeamIndex(null);
                        }}
                        className={`flex flex-1 flex-wrap items-center gap-2 border-b px-2 py-2 ${
                          dragOverTeamIndex === index
                            ? "border-[#dc2626] dark:border-[#ef4444] bg-[#dc2626]/5 dark:bg-[#ef4444]/5"
                            : "border-[#111111]/10 dark:border-[#333333]"
                        } ${draggingTeamIndex === index ? "opacity-40" : ""}`}
                      >
                        <span className="cursor-grab select-none text-xs text-[#111111]/30 dark:text-[#e5e5e5]/20">
                          :::
                        </span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleTeamNameChange(index, e.target.value)}
                          className="min-w-[160px] flex-1 rounded-sm border border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-2 py-1 text-sm text-[#111111] dark:text-[#e5e5e5] focus:border-[#dc2626] dark:focus:border-[#ef4444] focus:outline-none"
                        />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddTeamBelow(index)}
                          disabled={localLeagueSettings.teamNames.length >= 20}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/40 dark:text-[#e5e5e5]/30 hover:text-[#111111] dark:hover:text-[#e5e5e5] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Add Below
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamAt(index)}
                          disabled={localLeagueSettings.teamNames.length <= 2}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#dc2626] dark:text-[#ef4444] hover:underline disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#111111]/10 dark:border-[#333333] px-4 py-4 sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-[#111111]/40 dark:text-[#e5e5e5]/30">
              Changes apply immediately to scoring and league settings.
            </span>
            <button
              onClick={() => {
                setLeagueSettings(localLeagueSettings);
                onClose();
              }}
              className="w-full rounded-sm bg-[#dc2626] dark:bg-[#ef4444] px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:hover:bg-[#dc2626] sm:w-auto"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
