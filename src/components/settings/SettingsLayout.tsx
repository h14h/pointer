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
  scoring: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M10.75 10.818a1.5 1.5 0 0 0-1.5 0l-5 2.907A1 1 0 0 0 3.75 14.7v.55a1 1 0 0 0 .5.866l5 2.907a1.5 1.5 0 0 0 1.5 0l5-2.907a1 1 0 0 0 .5-.866v-.55a1 1 0 0 0-.5-.866l-5-2.907ZM12.25 2.875a1.5 1.5 0 0 0-1.5 0l-5 2.907A1 1 0 0 0 5.25 6.757v.55a1 1 0 0 0 .5.866l5 2.907a1.5 1.5 0 0 0 1.5 0l5-2.907a1 1 0 0 0 .5-.866v-.55a1 1 0 0 0-.5-.866l-5-2.907Z" />
    </svg>
  ),
  roster: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
    </svg>
  ),
  draft: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1h.01a1 1 0 0 1 0 2h-.01a1 1 0 0 1-1-1Zm0 5.25a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2h-.01a1 1 0 0 1-1-1Zm1 4.25a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01Z" clipRule="evenodd" />
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
