"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { settingsSections } from "@/components/settings/constants";
import { settingsSectionIcons } from "@/components/settings/sectionNavigation";
import type { SettingsSectionKey } from "@/components/settings/types";

interface SettingsLayoutProps {
  activeSection: SettingsSectionKey;
  children: ReactNode;
}

export function SettingsLayout({ activeSection, children }: SettingsLayoutProps) {
  return (
    <div className="grid gap-6 font-sans lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
      {/* Desktop: vertical sidebar */}
      <aside className="hidden lg:block">
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
      </aside>

      {/* Content area */}
      <section className="min-w-0">{children}</section>
    </div>
  );
}
