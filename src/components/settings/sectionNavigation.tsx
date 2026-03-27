import type { ReactNode } from "react";
import type { SettingsSectionKey } from "@/components/settings/types";

export const settingsSectionIcons: Record<SettingsSectionKey, ReactNode> = {
  projections: (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="4" width="14" height="3.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="8.25" width="14" height="3.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="12.5" width="14" height="3.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="5.75" r=".9" fill="currentColor" />
      <circle cx="6" cy="10" r=".9" fill="currentColor" />
      <circle cx="6" cy="14.25" r=".9" fill="currentColor" />
    </svg>
  ),
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
