"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MenuSelect } from "@/components/ui/MenuSelect";
import { Toggle } from "@/components/ui/Toggle";
import { useStore } from "@/store";

interface HeaderProps {
  onOpenUpload: () => void;
}

export function Header({ onOpenUpload }: HeaderProps) {
  const {
    isDraftMode,
    setDraftMode,
    leagues,
    activeLeagueId,
    setActiveLeague,
    setActiveTeamIndex,
    advanceActiveTeam,
    resetDraft,
    clearAllData,
  } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const leagueSettings = activeLeague?.leagueSettings;
  const draftStateForLeague = activeLeague?.draftState;
  const pathname = usePathname();
  const isSettingsPage = pathname === "/settings";
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isLeagueOpen, setIsLeagueOpen] = useState(false);

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

  const activeTeamIndex = draftStateForLeague?.activeTeamIndex ?? 0;
  const activeTeamName =
    leagueSettings?.teamNames[activeTeamIndex] ?? `Team ${activeTeamIndex + 1}`;
  const settingsHref = isSettingsPage ? "/" : "/settings?section=scoring";
  const settingsTitle = isSettingsPage ? "Back to leaderboard" : "Settings";

  const draftedEntries = Object.entries(draftStateForLeague?.draftedByTeam ?? {});
  const keeperEntries = Object.entries(draftStateForLeague?.keeperByTeam ?? {});
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
      <header className="border-b border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#111111]">
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
              <Button variant="primary" size="sm" onClick={onOpenUpload}>
                Upload
              </Button>
              <Button variant="destructiveGhost" size="sm" onClick={() => setIsClearOpen(true)}>
                Clear Projections
              </Button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLeagueOpen(!isLeagueOpen)}
                  className="flex items-center gap-1.5 rounded-sm border border-[#111111]/30 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111111]/70 dark:border-[#333333] dark:text-[#e5e5e5]/60 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
                >
                  <span className="max-w-[120px] truncate">{activeLeague?.name ?? "League"}</span>
                  <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5 shrink-0">
                    <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
                  </svg>
                </button>

                {isLeagueOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsLeagueOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-sm border border-[#111111]/15 bg-white shadow-lg dark:border-[#333333] dark:bg-[#1a1a1a]">
                      {leagues.map((league) => {
                        const isActive = league.id === activeLeagueId;
                        return (
                          <button
                            key={league.id}
                            type="button"
                            onClick={() => {
                              setActiveLeague(league.id);
                              setIsLeagueOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
                              isActive
                                ? "bg-[#dc2626]/[0.05] text-[#dc2626] dark:bg-[#ef4444]/[0.05] dark:text-[#ef4444]"
                                : "text-[#111111]/70 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/60 dark:hover:bg-[#2a2a2a]"
                            }`}
                          >
                            <span className="max-w-[140px] truncate">{league.name}</span>
                            {isActive && (
                              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                      <div className="border-t border-[#111111]/10 dark:border-[#e5e5e5]/[0.08]">
                        <Link
                          href="/settings?section=leagues"
                          onClick={() => setIsLeagueOpen(false)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#111111]/50 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/40 dark:hover:bg-[#2a2a2a]"
                        >
                          Manage leagues...
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111111]/60 dark:text-[#e5e5e5]/50">
                Draft Mode
                <Toggle
                  aria-label="Draft Mode"
                  checked={isDraftMode}
                  onClick={() => setDraftMode(!isDraftMode)}
                />
              </label>
              <Link
                href={settingsHref}
                aria-label="Settings"
                title={settingsTitle}
                className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-sm border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626] dark:focus-visible:outline-[#ef4444] ${
                  isSettingsPage
                    ? "border-[#dc2626] bg-[#dc2626] text-white dark:border-[#ef4444] dark:bg-[#ef4444] dark:text-[#111111]"
                    : "border-[#111111]/30 text-[#111111]/70 hover:bg-[#f5f5f5] hover:text-[#111111] dark:border-[#333333] dark:text-[#e5e5e5]/60 dark:hover:bg-[#1a1a1a] dark:hover:text-[#e5e5e5]"
                }`}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
                  <path
                    fill="currentColor"
                    d="M11.84 2.1a2.1 2.1 0 0 0-3.68 0l-.39.75a1 1 0 0 1-1.12.52l-.82-.2a2.1 2.1 0 0 0-2.6 2.6l.2.82a1 1 0 0 1-.52 1.12l-.75.39a2.1 2.1 0 0 0 0 3.68l.75.39a1 1 0 0 1 .52 1.12l-.2.82a2.1 2.1 0 0 0 2.6 2.6l.82-.2a1 1 0 0 1 1.12.52l.39.75a2.1 2.1 0 0 0 3.68 0l.39-.75a1 1 0 0 1 1.12-.52l.82.2a2.1 2.1 0 0 0 2.6-2.6l-.2-.82a1 1 0 0 1 .52-1.12l.75-.39a2.1 2.1 0 0 0 0-3.68l-.75-.39a1 1 0 0 1-.52-1.12l.2-.82a2.1 2.1 0 0 0-2.6-2.6l-.82.2a1 1 0 0 1-1.12-.52zm-1.84 10.9a3 3 0 1 1 0-6 3 3 0 0 1 0 6"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {isDraftMode && (
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#111111]/20 dark:border-[#333333] pt-4 font-sans text-sm text-[#111111] dark:text-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111111]/50 dark:text-[#e5e5e5]/40" style={{ fontVariant: "small-caps" }}>
                  Active Team
                </span>
                <MenuSelect
                  value={activeTeamIndex}
                  onChange={setActiveTeamIndex}
                  ariaLabel="Active team"
                  triggerClassName="px-2 py-1 text-sm normal-case tracking-normal"
                  menuClassName="min-w-[10rem]"
                  options={leagueSettings.teamNames.map((name, index) => ({
                    value: index,
                    label: name,
                  }))}
                />
                <Button variant="secondary" size="sm" onClick={advanceActiveTeam} className="px-2 py-1">
                  Next
                </Button>
              </div>

              <div className="text-[#111111]/70 dark:text-[#e5e5e5]/60">
                {activeTeamName}: {teamDraftedCount + teamKeeperCount}/{rosterTotal}
                {teamKeeperCount > 0 && ` (K ${teamKeeperCount})`}
              </div>

              <div className="text-[#111111]/50 dark:text-[#e5e5e5]/40">
                League: {draftedCount} drafted
                {keeperCount > 0 && `, ${keeperCount} keepers`}
              </div>

              <Button
                variant="destructiveGhost"
                size="sm"
                onClick={() => setIsResetOpen(true)}
                className="ml-auto hover:underline"
              >
                Reset Draft
              </Button>
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
              <Button variant="ghost" onClick={() => setIsResetOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  resetDraft();
                  setIsResetOpen(false);
                }}
              >
                Reset Draft
              </Button>
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
              This removes all projection groups and uploaded players, and clears draft picks from all leagues. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3 font-sans">
              <Button variant="ghost" onClick={() => setIsClearOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  clearAllData();
                  setIsClearOpen(false);
                }}
              >
                Delete Projections
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
