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

  return (
    <>
      <header className="border-b border-gray-300 dark:border-gray-800 bg-[#111111] dark:bg-[#111111]">
        <div className="mx-auto max-w-7xl px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-[#00ff88] font-mono">
                Pointer
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono">
                Draft board // Fantasy baseball projections
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenUpload}
                className="border border-[#00ff88] bg-[#00ff88]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.3)] hover:bg-[#00ff88]/20 transition-colors"
              >
                Upload
              </button>
              <button
                onClick={onOpenScoring}
                className="border border-gray-600 dark:border-gray-700 bg-transparent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gray-300 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-white transition-colors"
              >
                Scoring
              </button>
              <button
                onClick={() => setIsClearOpen(true)}
                className="border border-red-800 dark:border-red-900 bg-red-950/30 dark:bg-red-950/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400 dark:text-red-500 hover:bg-red-950/50 transition-colors"
              >
                Clear Projections
              </button>
              <label className="ml-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono">
                Draft Mode
                <button
                  role="switch"
                  aria-checked={isDraftMode}
                  aria-label="Draft Mode"
                  onClick={() => setDraftMode(!isDraftMode)}
                  className={`relative inline-flex h-5 w-10 items-center transition-colors ${
                    isDraftMode
                      ? "bg-[#00ff88]/20 border border-[#00ff88]/50"
                      : "bg-gray-700 dark:bg-gray-800 border border-gray-600 dark:border-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform transition-transform ${
                      isDraftMode
                        ? "translate-x-6 bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]"
                        : "translate-x-1 bg-gray-400 dark:bg-gray-500"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {isDraftMode && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border border-gray-700 dark:border-gray-800 bg-black/50 dark:bg-black/30 px-3 py-2 text-[11px] text-gray-300 dark:text-gray-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Active Team
                </span>
                <select
                  value={activeTeamIndex}
                  onChange={(e) => setActiveTeamIndex(parseInt(e.target.value, 10))}
                  aria-label="Active team"
                  className="border border-gray-700 dark:border-gray-800 bg-black dark:bg-black px-2 py-1 text-[11px] text-[#00ff88] font-mono"
                >
                  {leagueSettings.teamNames.map((name, index) => (
                    <option key={`team-${index}`} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={advanceActiveTeam}
                  className="border border-gray-700 dark:border-gray-800 bg-black/50 dark:bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-300 dark:text-gray-400 hover:border-[#00ff88]/50 hover:text-[#00ff88] transition-colors"
                >
                  Next
                </button>
              </div>

              <div className="text-[#00ff88]">
                {activeTeamName}: {teamDraftedCount + teamKeeperCount}/{rosterTotal}
                {teamKeeperCount > 0 && ` (K ${teamKeeperCount})`}
              </div>

              <div className="text-gray-500">
                League: {draftedCount} drafted
                {keeperCount > 0 && `, ${keeperCount} keepers`}
              </div>

              <button
                onClick={() => setIsResetOpen(true)}
                className="ml-auto px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-950/30 transition-colors"
              >
                Reset Draft
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Reset Draft Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80">
          <div role="dialog" aria-modal="true" aria-labelledby="v1-reset-title" className="relative mx-0 h-full w-full max-w-none border border-gray-700 dark:border-gray-800 border-t-2 border-t-[#00ff88] bg-[#0a0a0a] dark:bg-[#0a0a0a] p-6 overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              aria-label="Close reset modal"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border border-gray-700 dark:border-gray-800 bg-black text-gray-500 hover:text-white hover:border-gray-500 transition-colors"
            >
              <span className="text-sm leading-none font-mono">x</span>
            </button>
            <h2 id="v1-reset-title" className="mb-2 pr-10 text-xs font-bold uppercase tracking-wider text-white font-mono">
              Reset all draft picks?
            </h2>
            <p className="mb-6 text-[11px] text-gray-500 font-mono">
              This clears drafted players and keepers, but leaves projection data intact.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsResetOpen(false)}
                className="border border-gray-700 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDraft();
                  setIsResetOpen(false);
                }}
                className="border border-red-800 bg-red-950/40 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/60 transition-colors"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Projections Modal */}
      {isClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80">
          <div role="dialog" aria-modal="true" aria-labelledby="v1-clear-title" className="relative mx-0 h-full w-full max-w-none border border-gray-700 dark:border-gray-800 border-t-2 border-t-[#00ff88] bg-[#0a0a0a] dark:bg-[#0a0a0a] p-6 overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md">
            <button
              type="button"
              onClick={() => setIsClearOpen(false)}
              aria-label="Close delete projections modal"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center border border-gray-700 dark:border-gray-800 bg-black text-gray-500 hover:text-white hover:border-gray-500 transition-colors"
            >
              <span className="text-sm leading-none font-mono">x</span>
            </button>
            <h2 id="v1-clear-title" className="mb-2 pr-10 text-xs font-bold uppercase tracking-wider text-white font-mono">
              Delete all projections?
            </h2>
            <p className="mb-6 text-[11px] text-gray-500 font-mono">
              This removes all projection groups and uploaded players. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsClearOpen(false)}
                className="border border-gray-700 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setIsClearOpen(false);
                }}
                className="border border-red-800 bg-red-950/40 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/60 transition-colors"
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
