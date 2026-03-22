"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { settingsSections } from "@/components/settings/constants";
import type { SettingsSectionKey } from "@/components/settings/types";

interface SettingsLayoutProps {
  activeSection: SettingsSectionKey;
  children: ReactNode;
}

const sectionIcons: Record<SettingsSectionKey, ReactNode> = {
  leagues: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="4" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="7" y="9" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 6.5h5M5.5 8.5h3.5M9.5 11.5h5M9.5 13.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  draft: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M4 5.25h12M7 9.75h9M10 14.25h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="4" cy="5.25" r="1.25" fill="currentColor" />
      <circle cx="7" cy="9.75" r="1.25" fill="currentColor" />
      <circle cx="10" cy="14.25" r="1.25" fill="currentColor" />
    </svg>
  ),
  roster: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 3.25 16.75 10 10 16.75 3.25 10 10 3.25Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="10" cy="5.5" r="1.1" fill="currentColor" />
      <circle cx="14.5" cy="10" r="1.1" fill="currentColor" />
      <circle cx="10" cy="14.5" r="1.1" fill="currentColor" />
      <circle cx="5.5" cy="10" r="1.1" fill="currentColor" />
    </svg>
  ),
  scoring: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect x="3.25" y="4" width="13.5" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.25 8h7.5M6.25 12h2.5M11.25 12h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 4v12" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
    </svg>
  ),
};

export function SettingsLayout({ activeSection, children }: SettingsLayoutProps) {
  return (
    <div className="grid gap-6 font-sans md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
      {/* Mobile: horizontal tab bar */}
      <div className="md:hidden">
        <nav aria-label="Settings sections" className="flex gap-1 rounded-lg bg-[#111111]/[0.04] p-1 dark:bg-[#e5e5e5]/[0.06]">
          {settingsSections.map((section) => {
            const isActive = section.key === activeSection;
            return (
              <Link
                key={section.key}
                href={`/settings?section=${section.key}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? "bg-white text-[#111111] shadow-sm dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                    : "text-[#111111]/60 hover:text-[#111111]/80 dark:text-[#e5e5e5]/50 dark:hover:text-[#e5e5e5]/70"
                }`}
              >
                <span className={isActive ? "text-[#dc2626] dark:text-[#ef4444]" : ""}>{sectionIcons[section.key]}</span>
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden md:block">
        <nav aria-label="Settings sections" className="sticky top-6 grid gap-1">
          {settingsSections.map((section) => {
            const isActive = section.key === activeSection;
            return (
              <Link
                key={section.key}
                href={`/settings?section=${section.key}`}
                aria-current={isActive ? "page" : undefined}
                className={`group flex items-start gap-3 rounded-lg px-3 py-3 transition-all ${
                  isActive
                    ? "bg-[#111111]/[0.04] dark:bg-[#e5e5e5]/[0.06]"
                    : "hover:bg-[#111111]/[0.02] dark:hover:bg-[#e5e5e5]/[0.03]"
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 ${
                    isActive
                      ? "text-[#dc2626] dark:text-[#ef4444]"
                      : "text-[#111111]/45 group-hover:text-[#111111]/60 dark:text-[#e5e5e5]/38 dark:group-hover:text-[#e5e5e5]/55"
                  }`}
                >
                  {sectionIcons[section.key]}
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
      </aside>

      {/* Content area */}
      <section className="min-w-0">{children}</section>
    </div>
  );
}
