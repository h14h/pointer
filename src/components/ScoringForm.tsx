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
  { key: "R", label: "Runs (R)" },
  { key: "1B", label: "Singles (1B)" },
  { key: "2B", label: "Doubles (2B)" },
  { key: "3B", label: "Triples (3B)" },
  { key: "HR", label: "Home Runs (HR)" },
  { key: "RBI", label: "RBI" },
  { key: "SB", label: "Stolen Bases (SB)" },
  { key: "CS", label: "Caught Stealing (CS)" },
  { key: "BB", label: "Walks (BB)" },
  { key: "SO", label: "Strikeouts (SO)" },
  { key: "HBP", label: "Hit By Pitch (HBP)" },
  { key: "H", label: "Hits (H) - all types" },
  { key: "SF", label: "Sac Flies (SF)" },
  { key: "GDP", label: "GIDP" },
];

const pitchingCategories: { key: keyof ScoringSettings["pitching"]; label: string }[] = [
  { key: "IP", label: "Innings Pitched (IP)" },
  { key: "W", label: "Wins (W)" },
  { key: "L", label: "Losses (L)" },
  { key: "QS", label: "Quality Starts (QS)" },
  { key: "CG", label: "Complete Games (CG)" },
  { key: "ShO", label: "Shutouts (ShO)" },
  { key: "SV", label: "Saves (SV)" },
  { key: "BS", label: "Blown Saves (BS)" },
  { key: "HLD", label: "Holds (HLD)" },
  { key: "SO", label: "Strikeouts (SO)" },
  { key: "H", label: "Hits Allowed (H)" },
  { key: "ER", label: "Earned Runs (ER)" },
  { key: "HR", label: "HR Allowed (HR)" },
  { key: "BB", label: "Walks Allowed (BB)" },
  { key: "HBP", label: "Hit Batters (HBP)" },
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
  const rosterSlots: { key: RosterSlot; label: string }[] = [
    { key: "C", label: "C" },
    { key: "1B", label: "1B" },
    { key: "2B", label: "2B" },
    { key: "3B", label: "3B" },
    { key: "SS", label: "SS" },
    { key: "OF", label: "OF" },
    { key: "UTIL", label: "UTIL" },
    { key: "SP", label: "SP" },
    { key: "RP", label: "RP" },
    { key: "P", label: "P" },
  ];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl max-h-[85vh] overflow-hidden">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Scoring & League
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={presetSelection}
              onChange={(e) => setPresetSelection(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              {presetNames.map((key) => (
                <option key={key} value={key}>
                  {scoringPresets[key].name}
                </option>
              ))}
            </select>
            <button
              onClick={() => handlePreset(presetSelection)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Apply Preset
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto pr-2">
          {/* Tabs */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex rounded-full bg-slate-100 p-1 shadow-inner">
              <button
                onClick={() => setTab("batting")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === "batting"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Batting
              </button>
              <button
                onClick={() => setTab("pitching")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === "pitching"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pitching
              </button>
            </div>
            <div
              className={`flex items-center gap-2 pr-2 text-sm ${
                canMergeTwoWay ? "text-slate-600" : "text-slate-500"
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  mergeTwoWayRankings && canMergeTwoWay
                    ? "bg-emerald-500"
                    : "bg-slate-300"
                } ${canMergeTwoWay ? "" : "opacity-50 cursor-not-allowed"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    mergeTwoWayRankings && canMergeTwoWay
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {tab === "batting"
              ? battingCategories.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      defaultValue={scoringSettings.batting[key]}
                      key={`batting-${key}-${scoringSettings.name}`}
                      onChange={(e) =>
                        debouncedUpdateBatting(key, parseFloat(e.target.value) || 0)
                      }
                      className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                ))
              : pitchingCategories.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      defaultValue={scoringSettings.pitching[key]}
                      key={`pitching-${key}-${scoringSettings.name}`}
                      onChange={(e) =>
                        debouncedUpdatePitching(key, parseFloat(e.target.value) || 0)
                      }
                      className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                ))}
          </div>

          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              League & Draft
            </h3>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700">
                  Bench
                </label>
                <input
                  type="number"
                  min={0}
                  value={localLeagueSettings.roster.bench}
                  onChange={(e) => handleBenchChange(parseInt(e.target.value, 10) || 0)}
                  className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {rosterSlots.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm text-slate-700">
                    {label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={localLeagueSettings.roster.positions[key] ?? 0}
                    onChange={(e) =>
                      handleRosterChange(key, parseInt(e.target.value, 10) || 0)
                    }
                    className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              ))}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Teams ({localLeagueSettings.teamNames.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Order here sets draft order
              </span>
            </div>
            <div className="grid gap-2">
              {localLeagueSettings.teamNames.map((name, index) => (
                <div
                  key={`team-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 shadow-sm"
                >
                  <span className="w-10 text-xs font-medium text-slate-500">
                    T{index + 1}
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleTeamNameChange(index, e.target.value)}
                    className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveTeam(index, -1)}
                      disabled={index === 0}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveTeam(index, 1)}
                      disabled={index === localLeagueSettings.teamNames.length - 1}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTeamBelow(index)}
                      disabled={localLeagueSettings.teamNames.length >= 20}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Below
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamAt(index)}
                      disabled={localLeagueSettings.teamNames.length <= 2}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              setLeagueSettings(localLeagueSettings);
              onClose();
            }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
