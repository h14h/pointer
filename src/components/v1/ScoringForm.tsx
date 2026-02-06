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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLeagueSettings(localLeagueSettings);
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [localLeagueSettings, setLeagueSettings, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80">
      <div role="dialog" aria-modal="true" aria-labelledby="v1-scoring-title" className="relative mx-0 h-full w-full max-w-none border border-gray-700 dark:border-gray-800 border-t-2 border-t-[#00ff88] bg-[#0a0a0a] dark:bg-[#0a0a0a] p-3 pb-0 overflow-hidden flex flex-col sm:mx-4 sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:px-5 sm:pt-5 sm:pb-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scoring modal"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border border-gray-700 dark:border-gray-800 bg-black text-gray-500 hover:text-white hover:border-gray-500 transition-colors sm:right-5 sm:top-5"
        >
          <span className="text-sm leading-none font-mono">x</span>
        </button>

        {/* Header area */}
        <div className="-mx-3 -mt-3 border-b border-gray-700 dark:border-gray-800 bg-[#111] px-3 py-3 sm:-mx-5 sm:-mt-5 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="pr-12">
              <h2 id="v1-scoring-title" className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Scoring & League
              </h2>
              <p className="text-[10px] text-gray-500 font-mono">
                Tune scoring weights, roster sizes, and draft order.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <div className="grid gap-1 sm:min-w-[180px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                  Preset
                </span>
                <select
                  value={presetSelection}
                  onChange={(e) => setPresetSelection(e.target.value)}
                  aria-label="Scoring preset"
                  className="w-full border border-gray-700 dark:border-gray-800 bg-black px-2 py-1.5 text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none sm:w-auto"
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
                className="w-full border border-[#00ff88] bg-[#00ff88]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)] hover:bg-[#00ff88]/20 transition-colors sm:w-auto"
              >
                Apply Preset
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pr-1 pb-0 sm:pr-2">
          {/* Scoring section */}
          <div className="mb-4 border border-gray-700 dark:border-gray-800 bg-[#111] p-3 sm:mb-5 sm:p-4 mt-3 sm:mt-4">
            <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-white font-mono">
                  Scoring
                </h3>
                <p className="text-[10px] text-gray-500 font-mono">Set points per stat.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Tab toggle - square/angular */}
                <div className="flex border border-gray-700 dark:border-gray-800">
                  <button
                    onClick={() => setTab("batting")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      tab === "batting"
                        ? "bg-[#00ff88]/10 text-[#00ff88] border-r border-gray-700 dark:border-gray-800"
                        : "bg-transparent text-gray-500 hover:text-gray-300 border-r border-gray-700 dark:border-gray-800"
                    }`}
                  >
                    Batting
                  </button>
                  <button
                    onClick={() => setTab("pitching")}
                    className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      tab === "pitching"
                        ? "bg-[#00ff88]/10 text-[#00ff88]"
                        : "bg-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    Pitching
                  </button>
                </div>
                {/* Merge two-way toggle */}
                <div
                  className={`flex items-center gap-2 border border-gray-700 dark:border-gray-800 bg-black px-3 py-1.5 text-[10px] font-mono ${
                    canMergeTwoWay ? "text-gray-400" : "text-gray-600"
                  }`}
                  title={!canMergeTwoWay ? mergeHint : undefined}
                >
                  <span className="uppercase tracking-wider">Merge two-way</span>
                  <button
                    role="switch"
                    aria-checked={mergeTwoWayRankings}
                    aria-label="Merge two-way rankings"
                    aria-disabled={!canMergeTwoWay}
                    disabled={!canMergeTwoWay}
                    onClick={() => {
                      if (canMergeTwoWay) {
                        setMergeTwoWayRankings(!mergeTwoWayRankings);
                      }
                    }}
                    className={`relative inline-flex h-5 w-10 items-center transition-colors ${
                      mergeTwoWayRankings && canMergeTwoWay
                        ? "bg-[#00ff88]/20 border border-[#00ff88]/50"
                        : "bg-gray-700 border border-gray-600"
                    } ${canMergeTwoWay ? "" : "opacity-50 cursor-not-allowed"}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform transition-transform ${
                        mergeTwoWayRankings && canMergeTwoWay
                          ? "translate-x-6 bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]"
                          : "translate-x-1 bg-gray-400"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5 sm:gap-2 md:grid-cols-2">
              {tab === "batting"
                ? battingCategories.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 border border-gray-800 bg-black/50 px-3 py-1.5"
                    >
                      <label className="text-[11px] text-gray-400 font-mono">{label}</label>
                      <input
                        type="number"
                        step="0.5"
                        defaultValue={scoringSettings.batting[key]}
                        key={`batting-${key}-${scoringSettings.name}`}
                        onChange={(e) =>
                          debouncedUpdateBatting(key, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 border border-gray-700 bg-black px-2 py-1 text-right text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none sm:w-24"
                      />
                    </div>
                  ))
                : pitchingCategories.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 border border-gray-800 bg-black/50 px-3 py-1.5"
                    >
                      <label className="text-[11px] text-gray-400 font-mono">{label}</label>
                      <input
                        type="number"
                        step="0.5"
                        defaultValue={scoringSettings.pitching[key]}
                        key={`pitching-${key}-${scoringSettings.name}`}
                        onChange={(e) =>
                          debouncedUpdatePitching(key, parseFloat(e.target.value) || 0)
                        }
                        className="w-20 border border-gray-700 bg-black px-2 py-1 text-right text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none sm:w-24"
                      />
                    </div>
                  ))}
            </div>
          </div>

          {/* League & Draft section */}
          <div className="mb-4 border border-gray-700 dark:border-gray-800 bg-[#0a0a0a] p-3 sm:mb-5 sm:p-4">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-white font-mono">
                League & Draft
              </h3>
              <p className="text-[10px] text-gray-500 font-mono">Roster sizes and draft order.</p>
            </div>

            <div className="grid gap-5">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                    Roster
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono">Per team</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="border border-gray-700 dark:border-gray-800 bg-[#111] p-3">
                    <div className="grid gap-4">
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                          Outfield
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {outfieldSlots.map((key) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 border border-gray-800 bg-black/50 px-2 py-1.5 text-[10px] font-bold text-gray-400 font-mono"
                            >
                              <input
                                type="number"
                                min={0}
                                value={localLeagueSettings.roster.positions[key] ?? 0}
                                onChange={(e) =>
                                  handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                                }
                                className="h-7 w-7 border border-gray-700 bg-black text-center text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                              />
                              <span>{rosterSlotLabels[key]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                          Infield
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                          {infieldSlots.map((key) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 border border-gray-800 bg-black/50 px-2 py-1.5 text-[10px] font-bold text-gray-400 font-mono"
                            >
                              <input
                                type="number"
                                min={0}
                                value={localLeagueSettings.roster.positions[key] ?? 0}
                                onChange={(e) =>
                                  handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                                }
                                className="h-7 w-7 border border-gray-700 bg-black text-center text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                              />
                              <span>{rosterSlotLabels[key]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                          Flex
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {extraSlots.map((key) => (
                            <label
                              key={key}
                              className="flex items-center gap-2 border border-gray-800 bg-black/50 px-2 py-1.5 text-[10px] font-bold text-gray-400 font-mono"
                            >
                              <input
                                type="number"
                                min={0}
                                value={localLeagueSettings.roster.positions[key] ?? 0}
                                onChange={(e) =>
                                  handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                                }
                                className="h-7 w-7 border border-gray-700 bg-black text-center text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                              />
                              <span>{rosterSlotLabels[key]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid content-start gap-2 border border-gray-700 dark:border-gray-800 bg-[#0a0a0a] p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                      Pitchers
                    </div>
                    {pitcherSlots.map((key) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-3 border border-gray-800 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-gray-400 font-mono"
                      >
                        <span>{rosterSlotLabels[key]}</span>
                        <input
                          type="number"
                          min={0}
                          value={localLeagueSettings.roster.positions[key] ?? 0}
                          onChange={(e) =>
                            handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-14 border border-gray-700 bg-black px-2 py-1 text-right text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                        />
                      </label>
                    ))}
                    <div className="pt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                      Catchers
                    </div>
                    {catcherSlots.map((key) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-3 border border-gray-800 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-gray-400 font-mono"
                      >
                        <span>{rosterSlotLabels[key]}</span>
                        <input
                          type="number"
                          min={0}
                          value={localLeagueSettings.roster.positions[key] ?? 0}
                          onChange={(e) =>
                            handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-14 border border-gray-700 bg-black px-2 py-1 text-right text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  <label className="flex items-center justify-between gap-3 border border-gray-800 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-gray-400 font-mono">
                    <span>Bench</span>
                    <input
                      type="number"
                      min={0}
                      value={localLeagueSettings.roster.bench}
                      onChange={(e) =>
                        handleBenchChange(parseInt(e.target.value, 10) || 0)
                      }
                      className="w-14 border border-gray-700 bg-black px-2 py-1 text-right text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                    />
                  </label>
                  {reserveSlots.map((key) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-3 border border-gray-800 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-gray-400 font-mono"
                    >
                      <span>{rosterSlotLabels[key]}</span>
                      <input
                        type="number"
                        min={0}
                        value={localLeagueSettings.roster.positions[key] ?? 0}
                        onChange={(e) =>
                          handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                        }
                        className="w-14 border border-gray-700 bg-black px-2 py-1 text-right text-[11px] text-[#00ff88] font-mono focus:border-[#00ff88] focus:outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Teams */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">
                    Teams ({localLeagueSettings.teamNames.length})
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono">
                    Order here sets draft order
                  </span>
                </div>
                <div className="grid gap-1.5">
                  {localLeagueSettings.teamNames.map((name, index) => (
                    <div key={`team-${index}`} className="flex flex-wrap items-center gap-2">
                      <span className="w-8 text-[10px] font-mono text-gray-600">
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
                        className={`flex flex-1 flex-wrap items-center gap-2 border px-2 py-1.5 ${
                          dragOverTeamIndex === index
                            ? "border-[#00ff88]/50 bg-[#00ff88]/5"
                            : "border-gray-800 bg-black/50"
                        } ${draggingTeamIndex === index ? "opacity-60" : ""}`}
                      >
                        <span className="cursor-grab select-none text-[10px] text-gray-600 font-mono">
                          ::
                        </span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleTeamNameChange(index, e.target.value)}
                          className="min-w-[140px] flex-1 border border-gray-700 bg-black px-2 py-1 text-[11px] text-white font-mono placeholder:text-gray-600 focus:border-[#00ff88] focus:outline-none"
                        />
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddTeamBelow(index)}
                          disabled={localLeagueSettings.teamNames.length >= 20}
                          className="border border-gray-700 bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:border-gray-500 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Add Below
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamAt(index)}
                          disabled={localLeagueSettings.teamNames.length <= 2}
                          className="border border-red-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-950/30 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Footer */}
        <div className="-mx-3 border-t border-gray-700 dark:border-gray-800 bg-[#111] px-3 py-3 sm:-mx-5 sm:px-5 sm:py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] text-gray-600 font-mono">
              Changes apply immediately to scoring and league settings.
            </span>
            <button
              onClick={() => {
                setLeagueSettings(localLeagueSettings);
                onClose();
              }}
              className="w-full border border-[#00ff88] bg-[#00ff88]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)] hover:bg-[#00ff88]/20 transition-colors sm:w-auto"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
