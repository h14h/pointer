"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { settingsSections } from "@/components/settings/constants";
import type { SettingsSectionKey } from "@/components/settings/types";

interface SettingsLayoutProps {
  activeSection: SettingsSectionKey;
  children: ReactNode;
}

function navClass(isActive: boolean): string {
  if (isActive) {
    return "border-[#dc2626] bg-[#dc2626] text-white dark:border-[#ef4444] dark:bg-[#ef4444] dark:text-[#111111]";
  }
  return "border-[#111111]/10 bg-white text-[#111111]/75 hover:border-[#111111]/25 hover:text-[#111111] dark:border-[#333333] dark:bg-[#111111] dark:text-[#e5e5e5]/70 dark:hover:border-[#555555] dark:hover:text-[#e5e5e5]";
}

export function SettingsLayout({ activeSection, children }: SettingsLayoutProps) {
  return (
    <div className="grid gap-4 font-sans md:grid-cols-[15rem_minmax(0,1fr)] md:gap-6">
      <div className="md:hidden">
        <div className="grid grid-cols-3 gap-2 rounded-sm border border-[#111111]/10 bg-white p-2 dark:border-[#333333] dark:bg-[#111111]">
          {settingsSections.map((section) => {
            const isActive = section.key === activeSection;
            return (
              <Link
                key={section.key}
                href={`/settings?section=${section.key}`}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-sm border px-2 py-2 text-center text-[11px] font-bold uppercase tracking-widest transition-colors ${navClass(isActive)}`}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
      </div>

      <aside className="hidden md:block">
        <nav
          aria-label="Settings sections"
          className="sticky top-6 grid gap-2 rounded-sm border border-[#111111]/10 bg-white p-3 dark:border-[#333333] dark:bg-[#111111]"
        >
          {settingsSections.map((section) => {
            const isActive = section.key === activeSection;
            return (
              <Link
                key={section.key}
                href={`/settings?section=${section.key}`}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-sm border px-3 py-3 transition-colors ${navClass(isActive)}`}
              >
                <div className="text-xs font-bold uppercase tracking-widest">
                  {section.label}
                </div>
                <p className="mt-1 text-xs opacity-85">{section.description}</p>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="rounded-sm border border-[#111111]/10 bg-white p-4 dark:border-[#333333] dark:bg-[#111111] sm:p-6">
        {children}
      </section>
    </div>
  );
}
