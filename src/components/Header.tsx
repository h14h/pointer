"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { settingsSections } from "@/components/settings/constants";
import { settingsSectionIcons } from "@/components/settings/sectionNavigation";
import type { SettingsSectionKey } from "@/components/settings/types";
import { AppSheet } from "@/components/ui/AppSheet";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { FieldLabel } from "@/components/ui/FieldLabel";
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

  const settingsHref = isSettingsPage ? "/" : "/settings?section=scoring";
  const settingsTitle = isSettingsPage ? "Back to leaderboard" : "Settings";
  const pageLabel = isSettingsPage ? "Settings" : "Leaderboard";

  const closeAllMenus = () => {
    setIsLeagueOpen(false);
    setIsProjectionOpen(false);
    setIsMobileMenuOpen(false);
  };

  const projectionOptions = useMemo(
    () =>
      projectionGroups.map((group) => ({
        value: group.id,
        label: getProjectionGroupDisplayName(group),
        description: getProjectionGroupSourceLabel(group),
      })),
    [projectionGroups]
  );

  const leagueOptions = useMemo(
    () => leagues.map((league) => ({ value: league.id, label: league.name })),
    [leagues]
  );

  const projectionFooter = (
    <Link
      href="/settings?section=projections"
      onClick={closeAllMenus}
      className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-hover)]"
    >
      Manage Projections...
    </Link>
  );

  const leagueFooter = (
    <Link
      href="/settings?section=leagues"
      onClick={closeAllMenus}
      className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-[var(--color-fg-subtle)] hover:bg-[var(--color-surface-hover)]"
    >
      Manage leagues...
    </Link>
  );

  return (
    <>
      <header className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-base)]">
        <div className="mx-auto max-w-5xl px-[var(--space-page-x)] py-3 sm:px-[var(--space-page-x-sm)] sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="text-2xl font-bold tracking-tight text-[var(--color-fg-default)] sm:text-3xl"
                style={{ fontFamily: "var(--font-title)" }}
              >
                {isSettingsPage ? (
                  <Link
                    href="/"
                    className="text-inherit hover:text-[var(--color-accent)] transition-colors"
                  >
                    Pointer
                  </Link>
                ) : (
                  "Pointer"
                )}
              </h1>
              <p
                className="mt-1 text-sm font-sans text-[var(--color-fg-muted)] tracking-wide uppercase"
                style={{ fontVariant: "small-caps", letterSpacing: "0.1em" }}
              >
                {pageLabel}
              </p>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <label className="flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-3 py-1.5 font-sans text-sm font-medium text-[var(--color-fg-muted)]">
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
              <Dropdown
                options={projectionOptions}
                value={activeProjectionGroup?.id ?? projectionOptions[0]?.value ?? ""}
                onChange={(id) => {
                  setActiveProjectionGroup(id);
                  setIsLeagueOpen(false);
                }}
                placement="bottom-right"
                menuClassName="min-w-[220px]"
                footer={projectionFooter}
              />

              <Dropdown
                options={leagueOptions}
                value={activeLeague?.id ?? leagueOptions[0]?.value ?? ""}
                onChange={(id) => {
                  setActiveLeague(id);
                  setIsProjectionOpen(false);
                }}
                placement="bottom-right"
                menuClassName="min-w-[180px]"
                footer={leagueFooter}
              />

              <label className="flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-sm font-medium text-[var(--color-fg-muted)]">
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
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)]"
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
            <Dropdown
              options={projectionOptions}
              value={activeProjectionGroup?.id ?? projectionOptions[0]?.value ?? ""}
              onChange={(id) => {
                setActiveProjectionGroup(id);
                setIsLeagueOpen(false);
                setIsMobileMenuOpen(false);
              }}
              menuClassName="min-w-[220px]"
              footer={projectionFooter}
            />

            <Dropdown
              options={leagueOptions}
              value={activeLeague?.id ?? leagueOptions[0]?.value ?? ""}
              onChange={(id) => {
                setActiveLeague(id);
                setIsProjectionOpen(false);
                setIsMobileMenuOpen(false);
              }}
              menuClassName="min-w-[180px]"
              footer={leagueFooter}
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
                        ? "bg-[var(--color-fg-default)]/[0.05]"
                        : "hover:bg-[var(--color-fg-default)]/[0.025]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 ${
                        !isSettingsPage
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)]"
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
                          ? "text-[var(--color-fg-default)]"
                          : "text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-default)]"
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
                              ? "bg-[var(--color-fg-default)]/[0.05]"
                              : "hover:bg-[var(--color-fg-default)]/[0.025]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 shrink-0 ${
                              isActive
                                ? "text-[var(--color-accent)]"
                                : "text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)]"
                            }`}
                          >
                            {settingsSectionIcons[section.key]}
                          </span>
                          <div>
                            <div
                              className={`text-xs font-bold uppercase tracking-widest ${
                                isActive
                                  ? "text-[var(--color-fg-default)]"
                                  : "text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-default)]"
                              }`}
                            >
                              {section.label}
                            </div>
                            <p
                              className={`mt-0.5 text-[11px] leading-snug ${
                                isActive
                                  ? "text-[var(--color-fg-muted)]"
                                  : "text-[var(--color-fg-subtle)] group-hover:text-[var(--color-fg-muted)]"
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
