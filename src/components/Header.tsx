"use client";

import { useState } from "react";
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
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pointer</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Draft board for fantasy baseball projections
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenUpload}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Upload
              </button>
              <button
                onClick={onOpenScoring}
                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Scoring
              </button>
              <button
                onClick={() => setIsClearOpen(true)}
                className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/60"
              >
                Clear Projections
              </button>
              <label className="ml-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                Draft Mode
                <button
                  role="switch"
                  aria-checked={isDraftMode}
                  onClick={() => setDraftMode(!isDraftMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDraftMode ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-100 transition-transform ${
                      isDraftMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {isDraftMode && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Active Team
                </span>
                <select
                  value={activeTeamIndex}
                  onChange={(e) => setActiveTeamIndex(parseInt(e.target.value, 10))}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-slate-100"
                >
                  {leagueSettings.teamNames.map((name, index) => (
                    <option key={`team-${index}`} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={advanceActiveTeam}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Next
                </button>
              </div>

              <div className="text-slate-600 dark:text-slate-300">
                {activeTeamName}: {teamDraftedCount + teamKeeperCount}/{rosterTotal}
                {teamKeeperCount > 0 && ` (K ${teamKeeperCount})`}
              </div>

              <div className="text-slate-500 dark:text-slate-400">
                League: {draftedCount} drafted
                {keeperCount > 0 && `, ${keeperCount} keepers`}
              </div>

              <button
                onClick={() => setIsResetOpen(true)}
                className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Reset Draft
              </button>
            </div>
          )}
        </div>
      </header>
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-950/60 backdrop-blur-sm">
          <div className="relative mx-0 h-full w-full max-w-none rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-lg">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              aria-label="Close reset modal"
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-300 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 sm:right-4 sm:top-4"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <h2 className="mb-2 pr-10 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Reset all draft picks?
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
              This clears drafted players and keepers, but leaves projection data intact.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsResetOpen(false)}
                className="rounded-md px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDraft();
                  setIsResetOpen(false);
                }}
                className="rounded-md bg-red-100 dark:bg-red-950/50 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-950/70"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </div>
      )}
      {isClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-950/60 backdrop-blur-sm">
          <div className="relative mx-0 h-full w-full max-w-none rounded-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-lg">
            <button
              type="button"
              onClick={() => setIsClearOpen(false)}
              aria-label="Close delete projections modal"
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-700/70 bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-300 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 sm:right-4 sm:top-4"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <h2 className="mb-2 pr-10 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Delete all projections?
            </h2>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
              This removes all projection groups and uploaded players. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsClearOpen(false)}
                className="rounded-md px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setIsClearOpen(false);
                }}
                className="rounded-md bg-red-100 dark:bg-red-950/50 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-950/70"
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
