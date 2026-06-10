"use client";

import { useStore } from "@/store";
import type { Sport } from "@/types";

const SPORTS: { sport: Sport; label: string }[] = [
  { sport: "baseball", label: "Baseball" },
  { sport: "football", label: "Football" },
];

/**
 * Dedicated header control for switching the app between sports. Activates
 * the most recently used league of the chosen sport (creating one when none
 * exists) — picking a league is a separate, within-sport concern.
 */
export function SportSwitcher({ className = "" }: { className?: string }) {
  const { leagues, activeLeagueId, switchSport } = useStore();
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? leagues[0];
  const activeSport: Sport = activeLeague?.sport === "football" ? "football" : "baseball";

  return (
    <div
      role="group"
      aria-label="Sport"
      className={`flex items-center gap-0.5 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-0.5 font-sans ${className}`}
    >
      {SPORTS.map(({ sport, label }) => {
        const isActive = sport === activeSport;
        return (
          <button
            key={sport}
            type="button"
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) switchSport(sport);
            }}
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors ${
              isActive
                ? "bg-[var(--color-fg-default)] text-[var(--color-surface-base)]"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg-default)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
