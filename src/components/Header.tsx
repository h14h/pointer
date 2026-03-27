"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { settingsSections } from "@/components/settings/constants";
import { settingsSectionIcons } from "@/components/settings/sectionNavigation";
import type { SettingsSectionKey } from "@/components/settings/types";
import { AppSheet } from "@/components/ui/AppSheet";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { PillDropdown } from "@/components/ui/PillDropdown";
import { Toggle } from "@/components/ui/Toggle";
import { getProjectionGroupDisplayName, getProjectionGroupSourceLabel } from "@/lib/projectionGroups";
import { useStore } from "@/store";

interface HeaderProps {
  activeSettingsSection?: SettingsSectionKey;
}

export function Header({ activeSettingsSection = "scoring" }: HeaderProps) {
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isLeagueOpen) setIsLeagueOpen(false);
        if (isProjectionOpen) setIsProjectionOpen(false);
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      }
    };
    if (isLeagueOpen || isProjectionOpen || isMobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isLeagueOpen, isMobileMenuOpen, isProjectionOpen]);

  const settingsHref = isSettingsPage ? "/" : "/settings?section=scoring";
  const settingsTitle = isSettingsPage ? "Back to leaderboard" : "Settings";
  const pageLabel = isSettingsPage ? "Settings" : "Leaderboard";

  const closeAllMenus = () => {
    setIsLeagueOpen(false);
    setIsProjectionOpen(false);
    setIsMobileMenuOpen(false);
  };

  const projectionMenu = (
    <>
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
            className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left text-xs ${
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
          onClick={closeAllMenus}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-[#111111]/50 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/40 dark:hover:bg-[#2a2a2a]"
        >
          Manage Projections...
        </Link>
      </div>
    </>
  );

  const leagueMenu = (
    <>
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
            className={`flex w-full items-center gap-2 px-4 py-3 text-left text-xs ${
              isActive
                ? "bg-[#dc2626]/[0.05] text-[#dc2626] dark:bg-[#ef4444]/[0.05] dark:text-[#ef4444]"
                : "text-[#111111]/70 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/60 dark:hover:bg-[#2a2a2a]"
            }`}
          >
            <span className="max-w-[180px] truncate">{league.name}</span>
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
          onClick={closeAllMenus}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-[#111111]/50 hover:bg-[#f5f5f5] dark:text-[#e5e5e5]/40 dark:hover:bg-[#2a2a2a]"
        >
          Manage leagues...
        </Link>
      </div>
    </>
  );

  return (
    <>
      <header className="border-b border-[#111111]/20 dark:border-[#333333] bg-white dark:bg-[#111111]">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight text-[#111111] dark:text-[#e5e5e5] sm:text-3xl"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {isSettingsPage ? (
                  <Link
                    href="/"
                    className="text-inherit hover:text-[#dc2626] dark:hover:text-[#ef4444] transition-colors"
                  >
                    Pointer
                  </Link>
                ) : (
                  "Pointer"
                )}
              </h1>
              <p
                className="mt-1 text-sm font-sans text-[#111111]/60 dark:text-[#e5e5e5]/50 tracking-wide uppercase"
                style={{ fontVariant: "small-caps", letterSpacing: "0.1em" }}
              >
                {pageLabel}
              </p>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <label className="flex items-center gap-2 rounded-full border border-[#111111]/12 bg-[#111111]/[0.03] px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#111111]/68 dark:border-[#e5e5e5]/10 dark:bg-[#e5e5e5]/[0.04] dark:text-[#e5e5e5]/64">
                Draft
                <Toggle
                  aria-label="Draft Mode"
                  checked={isDraftMode}
                  onClick={() => setDraftMode(!isDraftMode)}
                />
              </label>
              <Button
                variant={isSettingsPage ? "toolbarActive" : "iconSubtle"}
                size="icon"
                aria-label="Open settings navigation"
                aria-haspopup="dialog"
                aria-expanded={isMobileMenuOpen}
                aria-controls="header-mobile-menu"
                onClick={() => {
                  setIsMobileMenuOpen(true);
                  setIsLeagueOpen(false);
                  setIsProjectionOpen(false);
                }}
                className="rounded-full"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </Button>
            </div>

            <div className="hidden flex-wrap items-center gap-3 font-sans lg:flex">
              <PillDropdown
                value={getProjectionGroupDisplayName(activeProjectionGroup)}
                menu={projectionMenu}
                isOpen={isProjectionOpen}
                onToggle={() => {
                  setIsProjectionOpen((open) => !open);
                  setIsLeagueOpen(false);
                }}
                onClose={() => setIsProjectionOpen(false)}
                align="right"
                triggerClassName="min-h-0 rounded-sm border-[#111111]/30 px-3 py-1.5 text-xs tracking-widest dark:border-[#333333]"
                menuClassName="min-w-[220px] rounded-sm"
              />

              <PillDropdown
                value={activeLeague?.name ?? "League"}
                menu={leagueMenu}
                isOpen={isLeagueOpen}
                onToggle={() => {
                  setIsLeagueOpen((open) => !open);
                  setIsProjectionOpen(false);
                }}
                onClose={() => setIsLeagueOpen(false)}
                align="right"
                triggerClassName="min-h-0 rounded-sm border-[#111111]/30 px-3 py-1.5 text-xs tracking-widest dark:border-[#333333]"
                menuClassName="min-w-[180px] rounded-sm"
              />

              <label className="flex items-center gap-2 rounded-full border border-[#111111]/12 bg-[#111111]/[0.03] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#111111]/68 dark:border-[#e5e5e5]/10 dark:bg-[#e5e5e5]/[0.04] dark:text-[#e5e5e5]/64">
                Draft
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
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  isSettingsPage
                    ? "border-[#dc2626] bg-[#dc2626] text-white dark:border-[#ef4444] dark:bg-[#ef4444] dark:text-[#111111]"
                    : "border-[#111111]/15 bg-[#111111]/[0.03] text-[#111111]/72 hover:bg-[#111111]/[0.07] hover:text-[#111111] dark:border-[#e5e5e5]/10 dark:bg-[#e5e5e5]/[0.04] dark:text-[#e5e5e5]/70 dark:hover:bg-[#e5e5e5]/[0.08] dark:hover:text-[#e5e5e5]"
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

          <div className="mt-4 flex flex-wrap gap-2 font-sans lg:hidden">
            <PillDropdown
              label="Projection"
              value={getProjectionGroupDisplayName(activeProjectionGroup)}
              menu={projectionMenu}
              isOpen={isProjectionOpen}
              onToggle={() => {
                setIsProjectionOpen((open) => !open);
                setIsLeagueOpen(false);
                setIsMobileMenuOpen(false);
              }}
              onClose={() => setIsProjectionOpen(false)}
              fullWidth
            />

            <PillDropdown
              label="League"
              value={activeLeague?.name ?? "League"}
              menu={leagueMenu}
              isOpen={isLeagueOpen}
              onToggle={() => {
                setIsLeagueOpen((open) => !open);
                setIsProjectionOpen(false);
                setIsMobileMenuOpen(false);
              }}
              onClose={() => setIsLeagueOpen(false)}
              fullWidth
            />
          </div>
        </div>
      </header>

      <div className="lg:hidden">
        <AppSheet
          open={isMobileMenuOpen}
          onOpenChange={setIsMobileMenuOpen}
          title="Menu"
          description="Settings Sections"
        >
          <div className="space-y-6">
            <section>
                  <Link
                    href="/"
                    onClick={closeAllMenus}
                    className={`group flex items-start gap-3 rounded-xl px-3 py-3 transition-all ${
                      !isSettingsPage
                        ? "bg-[#111111]/[0.05] dark:bg-[#e5e5e5]/[0.07]"
                        : "hover:bg-[#111111]/[0.025] dark:hover:bg-[#e5e5e5]/[0.035]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 ${
                        !isSettingsPage
                          ? "text-[#dc2626] dark:text-[#ef4444]"
                          : "text-[#111111]/45 group-hover:text-[#111111]/60 dark:text-[#e5e5e5]/38 dark:group-hover:text-[#e5e5e5]/55"
                      }`}
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                        <path d="M4 15V7.5L10 3l6 4.5V15a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="M8 16.5v-5h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div
                      className={`text-xs font-bold uppercase tracking-widest ${
                        !isSettingsPage
                          ? "text-[#111111] dark:text-[#e5e5e5]"
                          : "text-[#111111]/65 group-hover:text-[#111111]/80 dark:text-[#e5e5e5]/55 dark:group-hover:text-[#e5e5e5]/70"
                      }`}
                    >
                      Leaderboard
                    </div>
                  </Link>

                  <FieldLabel className="mb-3 mt-5 block tracking-[0.24em]">Settings</FieldLabel>
                  <nav aria-label="Settings sections" className="grid gap-1.5">
                    {settingsSections.map((section) => {
                      const isActive = isSettingsPage && section.key === activeSettingsSection;
                      return (
                        <Link
                          key={section.key}
                          href={`/settings?section=${section.key}`}
                          aria-current={isActive ? "page" : undefined}
                          onClick={closeAllMenus}
                          className={`group flex items-start gap-3 rounded-xl px-3 py-3 transition-all ${
                            isActive
                              ? "bg-[#111111]/[0.05] dark:bg-[#e5e5e5]/[0.07]"
                              : "hover:bg-[#111111]/[0.025] dark:hover:bg-[#e5e5e5]/[0.035]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 shrink-0 ${
                              isActive
                                ? "text-[#dc2626] dark:text-[#ef4444]"
                                : "text-[#111111]/45 group-hover:text-[#111111]/60 dark:text-[#e5e5e5]/38 dark:group-hover:text-[#e5e5e5]/55"
                            }`}
                          >
                            {settingsSectionIcons[section.key]}
                          </span>
                          <div>
                            <div
                              className={`text-xs font-bold uppercase tracking-widest ${
                                isActive
                                  ? "text-[#111111] dark:text-[#e5e5e5]"
                                  : "text-[#111111]/65 group-hover:text-[#111111]/80 dark:text-[#e5e5e5]/55 dark:group-hover:text-[#e5e5e5]/70"
                              }`}
                            >
                              {section.label}
                            </div>
                            <p
                              className={`mt-0.5 text-[11px] leading-snug ${
                                isActive
                                  ? "text-[#111111]/60 dark:text-[#e5e5e5]/50"
                                  : "text-[#111111]/45 group-hover:text-[#111111]/55 dark:text-[#e5e5e5]/38 dark:group-hover:text-[#e5e5e5]/48"
                              }`}
                            >
                              {section.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>
                </section>
          </div>
        </AppSheet>
      </div>
    </>
  );
}
