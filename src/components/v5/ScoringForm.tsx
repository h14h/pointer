"use client";

import { useState, useCallback, useEffect } from "react";
import { useStore } from "@/store";
import { scoringPresets, presetNames } from "@/lib/presets";
import { useDebouncedCallback } from "@/lib/useDebounce";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-[#0a0e1a]/70 backdrop-blur-md">
      <div className="relative mx-0 h-full w-full max-w-none rounded-none border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-2xl bg-white/80 dark:bg-[#0f1729]/90 p-3 pb-0 shadow-2xl shadow-teal-500/10 overflow-hidden flex flex-col sm:mx-4 sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl sm:px-6 sm:pt-6 sm:pb-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scoring modal"
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-md bg-white/60 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 shadow-sm transition hover:bg-white/80 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200 sm:right-6 sm:top-6"
        >
          <span className="text-lg leading-none">×</span>
        </button>
        <div className="-mx-3 -mt-3 border-b border-slate-200/40 dark:border-slate-600/20 backdrop-blur-xl bg-white/40 dark:bg-slate-800/30 px-3 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="pr-12">
              <h2 className="text-lg font-medium text-[#1e293b] dark:text-[#cbd5e1]">Scoring & League</h2>
              <p className="text-sm font-light text-slate-400 dark:text-slate-500">
                Tune scoring weights, roster sizes, and draft order.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <div className="grid gap-1 sm:min-w-[180px]">
                <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">Preset</span>
                <select
                  value={presetSelection}
                  onChange={(e) => setPresetSelection(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/50 dark:bg-slate-800/50 px-2 py-1.5 text-sm text-[#1e293b] dark:text-[#cbd5e1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10 sm:w-auto"
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
                className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/20 hover:from-teal-600 hover:to-cyan-600 transition-all sm:w-auto"
              >
                Apply Preset
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 pb-0 sm:pr-2">
          <div className="mb-5 rounded-2xl border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-md bg-white/40 dark:bg-slate-800/30 p-3 sm:mb-6 sm:p-4">
            <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-medium text-[#1e293b] dark:text-[#cbd5e1]">Scoring</h3>
                <p className="text-xs font-light text-slate-400 dark:text-slate-500">Set points per stat.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-full backdrop-blur-md bg-white/30 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-600/20 p-1">
                  <button
                    onClick={() => setTab("batting")}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-all sm:px-4 sm:py-1.5 ${
                      tab === "batting"
                        ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20"
                        : "text-slate-500 dark:text-slate-400 hover:text-[#1e293b] dark:hover:text-[#cbd5e1]"
                    }`}
                  >
                    Batting
                  </button>
                  <button
                    onClick={() => setTab("pitching")}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-all sm:px-4 sm:py-1.5 ${
                      tab === "pitching"
                        ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20"
                        : "text-slate-500 dark:text-slate-400 hover:text-[#1e293b] dark:hover:text-[#cbd5e1]"
                    }`}
                  >
                    Pitching
                  </button>
                </div>
                <div
                  className={`flex items-center gap-2 rounded-xl border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-md bg-white/40 dark:bg-slate-800/30 px-3 py-2 text-sm ${
                    canMergeTwoWay ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
                  }`}
                  title={!canMergeTwoWay ? mergeHint : undefined}
                >
                  <span>Merge two-way</span>
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
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                      mergeTwoWayRankings && canMergeTwoWay
                        ? "bg-gradient-to-r from-teal-400 to-cyan-400 shadow-md shadow-teal-500/20"
                        : "bg-slate-300 dark:bg-slate-700"
                    } ${canMergeTwoWay ? "" : "opacity-50 cursor-not-allowed"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        mergeTwoWayRankings && canMergeTwoWay
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
              {tab === "batting"
                ? battingCategories.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/50 dark:bg-slate-800/40 px-3 py-2 shadow-sm"
                    >
                      <label className="text-sm font-light text-[#1e293b] dark:text-[#cbd5e1]">{label}</label>
                      <input
                        type="number"
                        step="0.5"
                        defaultValue={scoringSettings.batting[key]}
                        key={`batting-${key}-${scoringSettings.name}`}
                        onChange={(e) =>
                          debouncedUpdateBatting(key, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 rounded-xl border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/30 dark:bg-slate-800/30 px-2 py-1 text-right text-sm text-[#1e293b] dark:text-[#cbd5e1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10 sm:w-24"
                      />
                    </div>
                  ))
                : pitchingCategories.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/50 dark:bg-slate-800/40 px-3 py-2 shadow-sm"
                    >
                      <label className="text-sm font-light text-[#1e293b] dark:text-[#cbd5e1]">{label}</label>
                      <input
                        type="number"
                        step="0.5"
                        defaultValue={scoringSettings.pitching[key]}
                        key={`pitching-${key}-${scoringSettings.name}`}
                        onChange={(e) =>
                          debouncedUpdatePitching(key, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 rounded-xl border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/30 dark:bg-slate-800/30 px-2 py-1 text-right text-sm text-[#1e293b] dark:text-[#cbd5e1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10 sm:w-24"
                      />
                    </div>
                  ))}
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-md bg-white/50 dark:bg-slate-800/30 p-3 shadow-xl shadow-teal-500/5 sm:mb-6 sm:p-4">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-sm font-medium text-[#1e293b] dark:text-[#cbd5e1]">League & Draft</h3>
              <p className="text-xs font-light text-slate-400 dark:text-slate-500">Roster sizes and draft order.</p>
            </div>

            <div className="grid gap-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Roster
                  </span>
                  <span className="text-xs font-light text-slate-300 dark:text-slate-600">Per team</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="rounded-2xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/30 dark:bg-slate-800/20 p-4 shadow-sm">
                    <div className="grid gap-4">
                      <div>
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Outfield
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                        {outfieldSlots.map((key) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/50 dark:bg-slate-800/40 px-2 py-2 text-xs font-medium text-[#1e293b] dark:text-[#cbd5e1] shadow-sm"
                          >
                            <input
                              type="number"
                              min={0}
                              value={localLeagueSettings.roster.positions[key] ?? 0}
                              onChange={(e) =>
                                handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                              }
                              className="h-9 w-9 rounded-lg border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/30 dark:bg-slate-800/30 text-center text-sm text-[#1e293b] dark:text-[#cbd5e1] focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10"
                            />
                            <span>{rosterSlotLabels[key]}</span>
                          </label>
                        ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Infield
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {infieldSlots.map((key) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/50 dark:bg-slate-800/40 px-2 py-2 text-xs font-medium text-[#1e293b] dark:text-[#cbd5e1] shadow-sm"
                          >
                            <input
                              type="number"
                              min={0}
                              value={localLeagueSettings.roster.positions[key] ?? 0}
                              onChange={(e) =>
                                handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                              }
                              className="h-9 w-9 rounded-lg border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/30 dark:bg-slate-800/30 text-center text-sm text-[#1e293b] dark:text-[#cbd5e1] focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10"
                            />
                            <span>{rosterSlotLabels[key]}</span>
                          </label>
                        ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Flex
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {extraSlots.map((key) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/50 dark:bg-slate-800/40 px-2 py-2 text-xs font-medium text-[#1e293b] dark:text-[#cbd5e1] shadow-sm"
                          >
                            <input
                              type="number"
                              min={0}
                              value={localLeagueSettings.roster.positions[key] ?? 0}
                              onChange={(e) =>
                                handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                              }
                              className="h-9 w-9 rounded-lg border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/30 dark:bg-slate-800/30 text-center text-sm text-[#1e293b] dark:text-[#cbd5e1] focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10"
                            />
                            <span>{rosterSlotLabels[key]}</span>
                          </label>
                        ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid content-start gap-3 rounded-2xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/50 dark:bg-slate-800/30 p-3 shadow-sm">
                    <div className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Pitchers
                    </div>
                    {pitcherSlots.map((key) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/30 dark:bg-slate-800/20 px-3 py-2 text-sm font-medium text-[#1e293b] dark:text-[#cbd5e1]"
                      >
                        <span>{rosterSlotLabels[key]}</span>
                        <input
                          type="number"
                          min={0}
                          value={localLeagueSettings.roster.positions[key] ?? 0}
                          onChange={(e) =>
                            handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-16 rounded-lg border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/40 dark:bg-slate-800/30 px-2 py-1 text-right text-sm text-[#1e293b] dark:text-[#cbd5e1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10"
                        />
                      </label>
                    ))}
                    <div className="pt-1 text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Catchers
                    </div>
                    {catcherSlots.map((key) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/30 dark:bg-slate-800/20 px-3 py-2 text-sm font-medium text-[#1e293b] dark:text-[#cbd5e1]"
                      >
                        <span>{rosterSlotLabels[key]}</span>
                        <input
                          type="number"
                          min={0}
                          value={localLeagueSettings.roster.positions[key] ?? 0}
                          onChange={(e) =>
                            handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-16 rounded-lg border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/40 dark:bg-slate-800/30 px-2 py-1 text-right text-sm text-[#1e293b] dark:text-[#cbd5e1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/30 dark:bg-slate-800/20 px-3 py-2 text-sm font-medium text-[#1e293b] dark:text-[#cbd5e1]">
                    <span>Bench</span>
                    <input
                      type="number"
                      min={0}
                      value={localLeagueSettings.roster.bench}
                      onChange={(e) =>
                        handleBenchChange(parseInt(e.target.value, 10) || 0)
                      }
                      className="w-16 rounded-lg border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/40 dark:bg-slate-800/30 px-2 py-1 text-right text-sm text-[#1e293b] dark:text-[#cbd5e1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10"
                    />
                  </label>
                  {reserveSlots.map((key) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/30 dark:bg-slate-800/20 px-3 py-2 text-sm font-medium text-[#1e293b] dark:text-[#cbd5e1]"
                    >
                      <span>{rosterSlotLabels[key]}</span>
                      <input
                        type="number"
                        min={0}
                        value={localLeagueSettings.roster.positions[key] ?? 0}
                        onChange={(e) =>
                          handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-16 rounded-lg border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/40 dark:bg-slate-800/30 px-2 py-1 text-right text-sm text-[#1e293b] dark:text-[#cbd5e1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Teams ({localLeagueSettings.teamNames.length})
                  </span>
                  <span className="text-[10px] font-light text-slate-300 dark:text-slate-600">
                    Order here sets draft order
                  </span>
                </div>
                <div className="grid gap-2">
                  {localLeagueSettings.teamNames.map((name, index) => (
                    <div key={`team-${index}`} className="flex flex-wrap items-center gap-3">
                      <span className="w-10 text-xs font-light text-slate-400 dark:text-slate-500">
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
                        className={`flex flex-1 flex-wrap items-center gap-2 rounded-xl border px-2 py-2 shadow-sm transition-all ${
                          dragOverTeamIndex === index
                            ? "border-teal-400/60 bg-teal-50/30 dark:bg-teal-900/20"
                            : "border-slate-200/40 dark:border-slate-600/20 backdrop-blur-md bg-white/50 dark:bg-slate-800/30"
                        } ${draggingTeamIndex === index ? "opacity-60" : ""}`}
                      >
                        <span className="cursor-grab select-none text-xs text-slate-300 dark:text-slate-600">
                          ⠿
                        </span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleTeamNameChange(index, e.target.value)}
                          className="min-w-[160px] flex-1 rounded-lg border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/30 dark:bg-slate-800/30 px-2 py-1 text-sm text-[#1e293b] dark:text-[#cbd5e1] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-teal-400 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 dark:focus:ring-teal-400/10"
                        />
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddTeamBelow(index)}
                          disabled={localLeagueSettings.teamNames.length >= 20}
                          className="rounded-xl border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/50 dark:bg-slate-800/50 px-2 py-1 text-xs font-medium text-[#1e293b] dark:text-[#cbd5e1] hover:bg-white/80 dark:hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                        >
                          Add Below
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamAt(index)}
                          disabled={localLeagueSettings.teamNames.length <= 2}
                          className="rounded-xl border border-red-200/40 dark:border-red-800/30 px-2 py-1 text-xs text-red-500 dark:text-red-400 hover:bg-red-50/40 dark:hover:bg-red-950/20 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
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

        <div className="-mx-3 border-t border-slate-200/40 dark:border-slate-600/20 backdrop-blur-xl bg-white/40 dark:bg-slate-800/30 px-3 py-3 sm:-mx-6 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-light text-slate-400 dark:text-slate-500">
              Changes apply immediately to scoring and league settings.
            </span>
            <button
              onClick={() => {
                setLeagueSettings(localLeagueSettings);
                onClose();
              }}
              className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-teal-500/20 hover:from-teal-600 hover:to-cyan-600 transition-all sm:w-auto"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
