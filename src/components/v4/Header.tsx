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
      <header className="border-b border-[#111111] dark:border-[#333333] bg-white dark:bg-[#111111]">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#111111] dark:text-[#e5e5e5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Pointer
              </h1>
              <p className="mt-1 text-sm font-sans text-[#111111]/60 dark:text-[#e5e5e5]/50 tracking-wide uppercase" style={{ fontVariant: "small-caps", letterSpacing: "0.1em" }}>
                Fantasy baseball draft board
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-sans">
              <button
                onClick={onOpenUpload}
                className="rounded-sm bg-[#dc2626] dark:bg-[#ef4444] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:hover:bg-[#dc2626] transition-colors"
              >
                Upload
              </button>
              <button
                onClick={onOpenScoring}
                className="rounded-sm border border-[#111111] dark:border-[#333333] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111111] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors"
              >
                Scoring
              </button>
              <button
                onClick={() => setIsClearOpen(true)}
                className="rounded-sm px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#dc2626] dark:text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Clear Projections
              </button>
              <label className="ml-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50">
                Draft Mode
                <button
                  role="switch"
                  aria-label="Draft Mode"
                  aria-checked={isDraftMode}
                  onClick={() => setDraftMode(!isDraftMode)}
                  className={`relative inline-flex h-5 w-10 items-center rounded-sm border transition-colors ${
                    isDraftMode
                      ? "border-[#dc2626] dark:border-[#ef4444] bg-[#dc2626] dark:bg-[#ef4444]"
                      : "border-[#111111]/30 dark:border-[#333333] bg-transparent"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-sm transition-transform ${
                      isDraftMode
                        ? "translate-x-6 bg-white"
                        : "translate-x-1 bg-[#111111]/40 dark:bg-[#e5e5e5]/40"
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {isDraftMode && (
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#111111]/20 dark:border-[#333333] pt-4 font-sans text-sm text-[#111111] dark:text-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                  Active Team
                </span>
                <select
                  aria-label="Active team"
                  value={activeTeamIndex}
                  onChange={(e) => setActiveTeamIndex(parseInt(e.target.value, 10))}
                  className="rounded-sm border border-[#111111]/30 dark:border-[#333333] bg-white dark:bg-[#1a1a1a] px-2 py-1 text-sm text-[#111111] dark:text-[#e5e5e5]"
                >
                  {leagueSettings.teamNames.map((name, index) => (
                    <option key={`team-${index}`} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={advanceActiveTeam}
                  className="rounded-sm border border-[#111111]/30 dark:border-[#333333] px-2 py-1 text-xs font-bold uppercase tracking-widest text-[#111111] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
                >
                  Next
                </button>
              </div>

              <div className="text-[#111111]/70 dark:text-[#e5e5e5]/60">
                {activeTeamName}: {teamDraftedCount + teamKeeperCount}/{rosterTotal}
                {teamKeeperCount > 0 && ` (K ${teamKeeperCount})`}
              </div>

              <div className="text-[#111111]/50 dark:text-[#e5e5e5]/40">
                League: {draftedCount} drafted
                {keeperCount > 0 && `, ${keeperCount} keepers`}
              </div>

              <button
                onClick={() => setIsResetOpen(true)}
                className="ml-auto text-xs font-bold uppercase tracking-widest text-[#dc2626] dark:text-[#ef4444] hover:underline"
              >
                Reset Draft
              </button>
            </div>
          )}
        </div>
      </header>
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/20 dark:bg-black/60">
          <div role="dialog" aria-modal="true" aria-labelledby="v4-reset-title" className="relative mx-0 h-full w-full max-w-none rounded-none border-l-4 border-l-[#dc2626] dark:border-l-[#ef4444] border-y border-r border-y-[#111111]/10 dark:border-y-[#333333] border-r-[#111111]/10 dark:border-r-[#333333] bg-white dark:bg-[#111111] p-8 overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-sm">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              aria-label="Close reset modal"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center text-[#111111]/50 dark:text-[#e5e5e5]/40 hover:text-[#111111] dark:hover:text-[#e5e5e5] transition-colors"
            >
              <span className="text-xl leading-none font-sans">&times;</span>
            </button>
            <h2 id="v4-reset-title" className="mb-3 pr-10 text-xl font-bold text-[#111111] dark:text-[#e5e5e5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Reset all draft picks?
            </h2>
            <p className="mb-8 font-sans text-sm leading-relaxed text-[#111111]/60 dark:text-[#e5e5e5]/50">
              This clears drafted players and keepers, but leaves projection data intact.
            </p>
            <div className="flex justify-end gap-3 font-sans">
              <button
                onClick={() => setIsResetOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50 hover:text-[#111111] dark:hover:text-[#e5e5e5]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDraft();
                  setIsResetOpen(false);
                }}
                className="rounded-sm bg-[#dc2626] dark:bg-[#ef4444] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:hover:bg-[#dc2626]"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </div>
      )}
      {isClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/20 dark:bg-black/60">
          <div role="dialog" aria-modal="true" aria-labelledby="v4-clear-title" className="relative mx-0 h-full w-full max-w-none rounded-none border-l-4 border-l-[#dc2626] dark:border-l-[#ef4444] border-y border-r border-y-[#111111]/10 dark:border-y-[#333333] border-r-[#111111]/10 dark:border-r-[#333333] bg-white dark:bg-[#111111] p-8 overflow-y-auto sm:mx-4 sm:h-auto sm:max-w-md sm:rounded-sm">
            <button
              type="button"
              onClick={() => setIsClearOpen(false)}
              aria-label="Close delete projections modal"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center text-[#111111]/50 dark:text-[#e5e5e5]/40 hover:text-[#111111] dark:hover:text-[#e5e5e5] transition-colors"
            >
              <span className="text-xl leading-none font-sans">&times;</span>
            </button>
            <h2 id="v4-clear-title" className="mb-3 pr-10 text-xl font-bold text-[#111111] dark:text-[#e5e5e5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Delete all projections?
            </h2>
            <p className="mb-8 font-sans text-sm leading-relaxed text-[#111111]/60 dark:text-[#e5e5e5]/50">
              This removes all projection groups and uploaded players. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 font-sans">
              <button
                onClick={() => setIsClearOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50 hover:text-[#111111] dark:hover:text-[#e5e5e5]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setIsClearOpen(false);
                }}
                className="rounded-sm bg-[#dc2626] dark:bg-[#ef4444] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#b91c1c] dark:hover:bg-[#dc2626]"
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
