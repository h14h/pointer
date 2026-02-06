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
      <header className="border-b border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#faf6f1] dark:bg-[#1a1410] shadow-lg shadow-amber-900/5">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#3d2b1f] dark:text-[#e8ddd0]" style={{ fontFamily: "Georgia, 'Palatino Linotype', Palatino, serif" }}>
                Pointer
              </h1>
              <p className="text-sm tracking-wide text-[#6b5744] dark:text-[#c4a882]" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
                Draft board for fantasy baseball projections
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
              <button
                onClick={onOpenUpload}
                className="rounded-full bg-[#c45d3e] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-amber-900/10 hover:bg-[#b04e32] transition-colors"
              >
                Upload
              </button>
              <button
                onClick={onOpenScoring}
                className="rounded-full border border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#faf6f1] dark:bg-[#2a1f18] px-5 py-2 text-sm font-medium text-[#3d2b1f] dark:text-[#e8ddd0] hover:bg-[#f0e6d8] dark:hover:bg-[#3d2b1f] transition-colors"
              >
                Scoring
              </button>
              <button
                onClick={() => setIsClearOpen(true)}
                className="rounded-full border border-[#e0a89a] dark:border-[#5a2a1a] bg-[#fdf0ed] dark:bg-[#2a1510] px-5 py-2 text-sm font-medium text-[#a0392a] dark:text-[#e8a090] hover:bg-[#f8d8d0] dark:hover:bg-[#3a1f15] transition-colors"
              >
                Clear Projections
              </button>
              <label className="ml-2 flex items-center gap-3 text-sm tracking-wide text-[#6b5744] dark:text-[#c4a882]">
                Draft Mode
                <button
                  role="switch"
                  aria-checked={isDraftMode}
                  aria-label="Draft Mode"
                  onClick={() => setDraftMode(!isDraftMode)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    isDraftMode ? "bg-[#c45d3e]/20 dark:bg-[#d4704a]/20" : "bg-[#d4c4b0] dark:bg-[#3d2b1f]"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full shadow-sm transition-transform ${
                      isDraftMode
                        ? "translate-x-6 bg-[#c45d3e] dark:bg-[#d4704a]"
                        : "translate-x-1 bg-white dark:bg-[#a08b70]"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {isDraftMode && (
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#f0e6d8] dark:bg-[#2a1f18] px-5 py-3 text-sm shadow-lg shadow-amber-900/5" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#6b5744] dark:text-[#c4a882]">
                  Active Team
                </span>
                <select
                  value={activeTeamIndex}
                  onChange={(e) => setActiveTeamIndex(parseInt(e.target.value, 10))}
                  aria-label="Active team"
                  className="rounded-xl border border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#faf6f1] dark:bg-[#1a1410] px-3 py-1.5 text-sm text-[#3d2b1f] dark:text-[#e8ddd0]"
                >
                  {leagueSettings.teamNames.map((name, index) => (
                    <option key={`team-${index}`} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={advanceActiveTeam}
                  className="rounded-full border border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#faf6f1] dark:bg-[#1a1410] px-4 py-1.5 text-xs font-semibold tracking-wide text-[#3d2b1f] dark:text-[#e8ddd0] hover:bg-[#f0e6d8] dark:hover:bg-[#3d2b1f] transition-colors"
                >
                  Next
                </button>
              </div>

              <div className="text-[#6b5744] dark:text-[#c4a882]">
                {activeTeamName}: {teamDraftedCount + teamKeeperCount}/{rosterTotal}
                {teamKeeperCount > 0 && ` (K ${teamKeeperCount})`}
              </div>

              <div className="text-[#6b5744] dark:text-[#c4a882]">
                League: {draftedCount} drafted
                {keeperCount > 0 && `, ${keeperCount} keepers`}
              </div>

              <button
                onClick={() => setIsResetOpen(true)}
                className="ml-auto rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-[#a0392a] dark:text-[#e8a090] hover:bg-[#fdf0ed] dark:hover:bg-[#2a1510] transition-colors"
              >
                Reset Draft
              </button>
            </div>
          )}
        </div>
      </header>
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3d2b1f]/20 dark:bg-[#0a0806]/60 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="v2-reset-title" className="relative mx-0 h-full w-full max-w-none rounded-none border border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#faf6f1] dark:bg-[#2a1f18] p-8 shadow-2xl overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-2xl">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              aria-label="Close reset modal"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#faf6f1]/80 dark:bg-[#2a1f18]/80 text-[#6b5744] dark:text-[#c4a882] shadow-sm backdrop-blur transition hover:bg-[#f0e6d8] dark:hover:bg-[#3d2b1f] hover:text-[#3d2b1f] dark:hover:text-[#e8ddd0]"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <h2 id="v2-reset-title" className="mb-3 pr-10 text-lg font-bold text-[#3d2b1f] dark:text-[#e8ddd0]" style={{ fontFamily: "Georgia, 'Palatino Linotype', Palatino, serif" }}>
              Reset all draft picks?
            </h2>
            <p className="mb-8 text-sm text-[#6b5744] dark:text-[#c4a882]" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
              This clears drafted players and keepers, but leaves projection data intact.
            </p>
            <div className="flex justify-end gap-3" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
              <button
                onClick={() => setIsResetOpen(false)}
                className="rounded-full px-5 py-2.5 text-sm text-[#6b5744] dark:text-[#c4a882] hover:bg-[#f0e6d8] dark:hover:bg-[#3d2b1f] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDraft();
                  setIsResetOpen(false);
                }}
                className="rounded-full bg-[#a0392a]/10 dark:bg-[#a0392a]/20 px-5 py-2.5 text-sm font-semibold text-[#a0392a] dark:text-[#e8a090] hover:bg-[#a0392a]/20 dark:hover:bg-[#a0392a]/30 transition-colors"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </div>
      )}
      {isClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3d2b1f]/20 dark:bg-[#0a0806]/60 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="v2-clear-title" className="relative mx-0 h-full w-full max-w-none rounded-none border border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#faf6f1] dark:bg-[#2a1f18] p-8 shadow-2xl overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-2xl">
            <button
              type="button"
              onClick={() => setIsClearOpen(false)}
              aria-label="Close delete projections modal"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4c4b0] dark:border-[#3d2b1f] bg-[#faf6f1]/80 dark:bg-[#2a1f18]/80 text-[#6b5744] dark:text-[#c4a882] shadow-sm backdrop-blur transition hover:bg-[#f0e6d8] dark:hover:bg-[#3d2b1f] hover:text-[#3d2b1f] dark:hover:text-[#e8ddd0]"
            >
              <span className="text-lg leading-none">×</span>
            </button>
            <h2 id="v2-clear-title" className="mb-3 pr-10 text-lg font-bold text-[#3d2b1f] dark:text-[#e8ddd0]" style={{ fontFamily: "Georgia, 'Palatino Linotype', Palatino, serif" }}>
              Delete all projections?
            </h2>
            <p className="mb-8 text-sm text-[#6b5744] dark:text-[#c4a882]" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
              This removes all projection groups and uploaded players. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
              <button
                onClick={() => setIsClearOpen(false)}
                className="rounded-full px-5 py-2.5 text-sm text-[#6b5744] dark:text-[#c4a882] hover:bg-[#f0e6d8] dark:hover:bg-[#3d2b1f] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setIsClearOpen(false);
                }}
                className="rounded-full bg-[#a0392a]/10 dark:bg-[#a0392a]/20 px-5 py-2.5 text-sm font-semibold text-[#a0392a] dark:text-[#e8a090] hover:bg-[#a0392a]/20 dark:hover:bg-[#a0392a]/30 transition-colors"
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
