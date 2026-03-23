"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toggle } from "@/components/ui/Toggle";
import { getProjectionGroupDisplayName, getProjectionGroupSourceLabel } from "@/lib/projectionGroups";
import { useStore } from "@/store";

export function Header() {
  const {
    isDraftMode,
    setDraftMode,
    leagues,
    activeLeagueId,
    setActiveLeague,
    projectionGroups,
    activeProjectionGroupId,
    setActiveProjectionGroup,
  } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const activeProjectionGroup =
    projectionGroups.find((group) => group.id === activeProjectionGroupId) ??
    projectionGroups[0] ??
    null;
  const pathname = usePathname();
  const isSettingsPage = pathname === "/settings";
  const [isLeagueOpen, setIsLeagueOpen] = useState(false);
  const [isProjectionOpen, setIsProjectionOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isLeagueOpen) setIsLeagueOpen(false);
        if (isProjectionOpen) setIsProjectionOpen(false);
      }
    };
    if (isLeagueOpen || isProjectionOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isLeagueOpen, isProjectionOpen]);

  const settingsHref = isSettingsPage ? "/" : "/settings?section=scoring";
  const settingsTitle = isSettingsPage ? "Back to leaderboard" : "Settings";

  return (
    <>
      <header className="border-b border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#111111]">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1
                className="text-3xl font-bold tracking-tight text-[#111111] dark:text-[#e5e5e5]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Pointer
              </h1>
              <p
                className="mt-1 text-sm font-sans text-[#111111]/60 dark:text-[#e5e5e5]/50 tracking-wide uppercase"
                style={{ fontVariant: "small-caps", letterSpacing: "0.1em" }}
              >
                Fantasy baseball draft board
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-sans">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsProjectionOpen((open) => !open);
                    setIsLeagueOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-sm border border-[#111111]/30 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111111]/70 dark:border-[#333333] dark:text-[#e5e5e5]/60 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
                >
                  <span className="max-w-[140px] truncate">
                    {getProjectionGroupDisplayName(activeProjectionGroup)}
                  </span>
                  <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5 shrink-0">
                    <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
                  </svg>
                </button>

                {isProjectionOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProjectionOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-sm border border-[#111111]/15 bg-white shadow-lg dark:border-[#333333] dark:bg-[#1a1a1a]">
                      {projectionGroups.map((group) => {
                        const isActive = group.id === activeProjectionGroup?.id;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setActiveProjectionGroup(group.id);
                              setIsProjectionOpen(false);
                            }}
                            className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-xs ${
                              isActive
                                ? "bg-[#dc2626]/[0.05] text-[#dc2626] dark:bg-[#ef4444]/[0.05] dark:text-[#ef4444]"
                                : "text-[#111111]/70 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/60 dark:hover:bg-[#2a2a2a]"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-bold uppercase tracking-widest">
                                {getProjectionGroupDisplayName(group)}
                              </div>
                              <div className="mt-1 text-[10px] font-bold uppercase tracking-widest opacity-70">
                                {getProjectionGroupSourceLabel(group)}
                              </div>
                            </div>
                            {isActive ? (
                              <svg viewBox="0 0 12 12" fill="none" className="mt-0.5 h-3 w-3 shrink-0">
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : null}
                          </button>
                        );
                      })}
                      <div className="border-t border-[#111111]/10 dark:border-[#e5e5e5]/[0.08]">
                        <Link
                          href="/settings?section=projections"
                          onClick={() => setIsProjectionOpen(false)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#111111]/50 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/40 dark:hover:bg-[#2a2a2a]"
                        >
                          Manage Projections...
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsLeagueOpen((open) => !open);
                    setIsProjectionOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-sm border border-[#111111]/30 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#111111]/70 dark:border-[#333333] dark:text-[#e5e5e5]/60 hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]"
                >
                  <span className="max-w-[120px] truncate">{activeLeague?.name ?? "League"}</span>
                  <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5 shrink-0">
                    <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
                  </svg>
                </button>

                {isLeagueOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsLeagueOpen(false)} />
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
                            {isActive ? (
                              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3 shrink-0">
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : null}
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
        </div>
      </header>
    </>
  );
}
