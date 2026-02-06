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
      <header className="border-b border-slate-200/50 dark:border-slate-700/30 backdrop-blur-xl bg-white/70 dark:bg-[#0f1729]/80">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-medium tracking-tight text-[#1e293b] dark:text-[#cbd5e1]">Pointer</h1>
              <p className="text-sm font-light text-slate-500 dark:text-slate-400">
                Draft board for fantasy baseball projections
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenUpload}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg shadow-teal-500/20 hover:from-teal-600 hover:to-cyan-600 transition-all"
              >
                Upload
              </button>
              <button
                onClick={onOpenScoring}
                className="rounded-xl border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/50 dark:bg-slate-800/50 px-4 py-1.5 text-sm font-medium text-[#1e293b] dark:text-[#cbd5e1] hover:bg-white/80 dark:hover:bg-slate-700/50 transition-all"
              >
                Scoring
              </button>
              <button
                onClick={() => setIsClearOpen(true)}
                className="rounded-xl border border-red-200/60 dark:border-red-800/40 backdrop-blur-md bg-red-50/50 dark:bg-red-950/30 px-4 py-1.5 text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-100/60 dark:hover:bg-red-950/50 transition-all"
              >
                Clear Projections
              </button>
              <label className="ml-2 flex items-center gap-2 text-sm font-light text-slate-500 dark:text-slate-400">
                <span className="tracking-wide text-xs uppercase">Draft Mode</span>
                <button
                  role="switch"
                  aria-checked={isDraftMode}
                  aria-label="Draft Mode"
                  onClick={() => setDraftMode(!isDraftMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                    isDraftMode
                      ? "bg-gradient-to-r from-teal-400 to-cyan-400 shadow-md shadow-teal-500/20"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      isDraftMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {isDraftMode && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-xl bg-white/60 dark:bg-[#0f1729]/60 px-4 py-2.5 text-sm shadow-xl shadow-teal-500/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Active Team
                </span>
                <select
                  value={activeTeamIndex}
                  onChange={(e) => setActiveTeamIndex(parseInt(e.target.value, 10))}
                  aria-label="Active team"
                  className="rounded-xl border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/50 dark:bg-slate-800/50 px-2 py-1 text-sm text-[#1e293b] dark:text-[#cbd5e1]"
                >
                  {leagueSettings.teamNames.map((name, index) => (
                    <option key={`team-${index}`} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={advanceActiveTeam}
                  className="rounded-xl border border-slate-200/60 dark:border-slate-600/40 backdrop-blur-md bg-white/50 dark:bg-slate-800/50 px-3 py-1 text-xs font-medium text-[#1e293b] dark:text-[#cbd5e1] hover:bg-white/80 dark:hover:bg-slate-700/50 transition-all"
                >
                  Next
                </button>
              </div>

              <div className="text-slate-600 dark:text-slate-300">
                {activeTeamName}: {teamDraftedCount + teamKeeperCount}/{rosterTotal}
                {teamKeeperCount > 0 && ` (K ${teamKeeperCount})`}
              </div>

              <div className="text-slate-400 dark:text-slate-500">
                League: {draftedCount} drafted
                {keeperCount > 0 && `, ${keeperCount} keepers`}
              </div>

              <button
                onClick={() => setIsResetOpen(true)}
                className="ml-auto rounded-xl px-3 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-all"
              >
                Reset Draft
              </button>
            </div>
          )}
        </div>
      </header>
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-[#0a0e1a]/70 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-labelledby="v5-reset-title" className="relative mx-0 h-full w-full max-w-none rounded-none border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-2xl bg-white/80 dark:bg-[#0f1729]/90 p-6 shadow-2xl shadow-teal-500/5 overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              aria-label="Close reset modal"
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-md bg-white/60 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 shadow-sm transition hover:bg-white/80 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200 sm:right-4 sm:top-4"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <h2 id="v5-reset-title" className="mb-2 pr-10 text-lg font-medium text-[#1e293b] dark:text-[#cbd5e1]">
              Reset all draft picks?
            </h2>
            <p className="mb-6 text-sm font-light text-slate-500 dark:text-slate-400">
              This clears drafted players and keepers, but leaves projection data intact.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsResetOpen(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDraft();
                  setIsResetOpen(false);
                }}
                className="rounded-xl border border-red-200/60 dark:border-red-800/40 bg-red-50/80 dark:bg-red-950/40 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-100/80 dark:hover:bg-red-950/60 transition-all"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </div>
      )}
      {isClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-[#0a0e1a]/70 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-labelledby="v5-clear-title" className="relative mx-0 h-full w-full max-w-none rounded-none border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-2xl bg-white/80 dark:bg-[#0f1729]/90 p-6 shadow-2xl shadow-teal-500/5 overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
            <button
              type="button"
              onClick={() => setIsClearOpen(false)}
              aria-label="Close delete projections modal"
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/50 dark:border-slate-600/30 backdrop-blur-md bg-white/60 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 shadow-sm transition hover:bg-white/80 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200 sm:right-4 sm:top-4"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <h2 id="v5-clear-title" className="mb-2 pr-10 text-lg font-medium text-[#1e293b] dark:text-[#cbd5e1]">
              Delete all projections?
            </h2>
            <p className="mb-6 text-sm font-light text-slate-500 dark:text-slate-400">
              This removes all projection groups and uploaded players. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsClearOpen(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setIsClearOpen(false);
                }}
                className="rounded-xl border border-red-200/60 dark:border-red-800/40 bg-red-50/80 dark:bg-red-950/40 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-100/80 dark:hover:bg-red-950/60 transition-all"
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
