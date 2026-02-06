"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store";

interface HeaderProps {
  onOpenUpload: () => void;
  onOpenScoring: () => void;
}

export function Header({ onOpenUpload, onOpenScoring }: HeaderProps) {
  const {
    isDraftMode,
    setDraftMode,
    leagueSettings,
    draftState,
    setActiveTeamIndex,
    advanceActiveTeam,
    resetDraft,
    clearAllData,
  } = useStore();
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isResetOpen) setIsResetOpen(false);
        if (isClearOpen) setIsClearOpen(false);
      }
    };
    if (isResetOpen || isClearOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isResetOpen, isClearOpen]);

  const activeTeamIndex = draftState.activeTeamIndex;
  const activeTeamName =
    leagueSettings.teamNames[activeTeamIndex] ?? `Team ${activeTeamIndex + 1}`;

  const draftedEntries = Object.entries(draftState.draftedByTeam);
  const keeperEntries = Object.entries(draftState.keeperByTeam);
  const draftedCount = draftedEntries.length;
  const keeperCount = keeperEntries.length;
  const teamDraftedCount = draftedEntries.filter(
    ([, teamIndex]) => Number(teamIndex) === activeTeamIndex
  ).length;
  const teamKeeperCount = keeperEntries.filter(
    ([, teamIndex]) => Number(teamIndex) === activeTeamIndex
  ).length;
  const rosterTotal =
    Object.values(leagueSettings.roster.positions).reduce((sum, value) => sum + value, 0) +
    leagueSettings.roster.bench;

  return (
    <>
      <header className="border-b-2 border-purple-500/30 dark:border-purple-700/40 bg-white dark:bg-[#0f0a1a]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                Pointer
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide">
                Draft board for fantasy baseball projections
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenUpload}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-500/25 dark:shadow-purple-500/20 hover:shadow-purple-500/40 hover:brightness-110 transition-all"
              >
                Upload
              </button>
              <button
                onClick={onOpenScoring}
                className="rounded-lg border-2 border-purple-400 dark:border-purple-600 bg-white dark:bg-[#1a1030] px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
              >
                Scoring
              </button>
              <button
                onClick={() => setIsClearOpen(true)}
                className="rounded-lg border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
              >
                Clear Projections
              </button>
              <label className="ml-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Draft Mode
                <button
                  role="switch"
                  aria-checked={isDraftMode}
                  aria-label="Draft Mode"
                  onClick={() => setDraftMode(!isDraftMode)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
                    isDraftMode
                      ? "bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg shadow-purple-500/30"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      isDraftMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {isDraftMode && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-purple-300 dark:border-purple-800 bg-[#f0f4ff] dark:bg-[#1a1030] px-4 py-3 text-sm shadow-lg shadow-purple-500/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Active Team
                </span>
                <select
                  value={activeTeamIndex}
                  onChange={(e) => setActiveTeamIndex(parseInt(e.target.value, 10))}
                  aria-label="Active team"
                  className="rounded-lg border-2 border-purple-300 dark:border-purple-700 bg-white dark:bg-[#0f0a1a] px-2 py-1 text-sm font-semibold text-[#1e1e2e] dark:text-[#f0f0f0] focus:border-purple-500 focus:ring-2 focus:ring-purple-300 dark:focus:ring-purple-800"
                >
                  {leagueSettings.teamNames.map((name, index) => (
                    <option key={`team-${index}`} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={advanceActiveTeam}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 hover:brightness-110 transition-all"
                >
                  Next
                </button>
              </div>

              <div className="font-semibold text-[#1e1e2e] dark:text-[#f0f0f0]">
                {activeTeamName}: {teamDraftedCount + teamKeeperCount}/{rosterTotal}
                {teamKeeperCount > 0 && ` (K ${teamKeeperCount})`}
              </div>

              <div className="text-slate-500 dark:text-slate-400 font-medium">
                League: {draftedCount} drafted
                {keeperCount > 0 && `, ${keeperCount} keepers`}
              </div>

              <button
                onClick={() => setIsResetOpen(true)}
                className="ml-auto rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Reset Draft
              </button>
            </div>
          )}
        </div>
      </header>
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="v3-reset-title" className="relative mx-0 h-full w-full max-w-none rounded-none border-2 border-purple-300 dark:border-purple-800 bg-white dark:bg-[#1a1030] p-6 shadow-2xl shadow-purple-500/20 overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-500 sm:rounded-t-2xl" />
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              aria-label="Close reset modal"
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-[#0f0a1a] text-slate-500 dark:text-slate-300 shadow-sm transition hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-700 dark:hover:text-purple-300 sm:right-4 sm:top-4"
            >
              <span className="text-lg leading-none font-bold">x</span>
            </button>
            <h2 id="v3-reset-title" className="mb-2 pr-10 text-lg font-black tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
              Reset all draft picks?
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              This clears drafted players and keepers, but leaves projection data intact.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsResetOpen(false)}
                className="rounded-lg border-2 border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDraft();
                  setIsResetOpen(false);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-red-500/25 hover:bg-red-600 transition-colors"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </div>
      )}
      {isClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="v3-clear-title" className="relative mx-0 h-full w-full max-w-none rounded-none border-2 border-purple-300 dark:border-purple-800 bg-white dark:bg-[#1a1030] p-6 shadow-2xl shadow-purple-500/20 overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-blue-500 sm:rounded-t-2xl" />
            <button
              type="button"
              onClick={() => setIsClearOpen(false)}
              aria-label="Close delete projections modal"
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-[#0f0a1a] text-slate-500 dark:text-slate-300 shadow-sm transition hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-700 dark:hover:text-purple-300 sm:right-4 sm:top-4"
            >
              <span className="text-lg leading-none font-bold">x</span>
            </button>
            <h2 id="v3-clear-title" className="mb-2 pr-10 text-lg font-black tracking-wider text-[#1e1e2e] dark:text-[#f0f0f0]">
              Delete all projections?
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              This removes all projection groups and uploaded players. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsClearOpen(false)}
                className="rounded-lg border-2 border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setIsClearOpen(false);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-red-500/25 hover:bg-red-600 transition-colors"
              >
                Delete Projections
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
