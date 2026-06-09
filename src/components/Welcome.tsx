"use client";

import { useStore } from "@/store";
import type { Sport } from "@/types";

const BaseballGlyph = (
  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-12 w-12">
    <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
    <path
      d="M10 9c4 4.2 6.5 9.5 6.5 15S14 35 10 39M38 9c-4 4.2-6.5 9.5-6.5 15S34 35 38 39"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M14.5 16l3.4 1.4M14.5 32l3.4-1.4M33.5 16l-3.4 1.4M33.5 32l-3.4-1.4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const FootballGlyph = (
  <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-12 w-12">
    <path
      d="M9.5 38.5c-2.4-2.4-3.2-10.6 4-17.8s15.4-6.4 17.8-4 3.2 10.6-4 17.8-15.4 6.4-17.8 4Z"
      stroke="currentColor"
      strokeWidth="2.5"
      transform="translate(3.5 3.5)"
    />
    <path
      d="M18 30l12-12M20.5 21.5l3 3M24 18l3 3M17 25l3 3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      transform="translate(3.5 3.5)"
    />
  </svg>
);

type SportCard = {
  sport: Sport;
  title: string;
  description: string;
  glyph: React.ReactNode;
};

const sportCards: SportCard[] = [
  {
    sport: "baseball",
    title: "Baseball",
    description:
      "Rank batters and pitchers with your league's exact scoring. Built-in 2025 league leaders let you explore before uploading anything.",
    glyph: BaseballGlyph,
  },
  {
    sport: "football",
    title: "Football",
    description:
      "Prep for the NFL season with Standard, Half, and Full PPR presets, FLEX-aware rankings, and live snake-draft tracking.",
    glyph: FootballGlyph,
  },
];

export function Welcome() {
  const completeOnboarding = useStore((state) => state.completeOnboarding);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-base)]">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-[var(--space-page-x)] py-12 sm:px-[var(--space-page-x-sm)]">
        <header className="text-center">
          <h1
            className="text-5xl font-bold tracking-tight text-[var(--color-fg-default)] sm:text-6xl"
            style={{ fontFamily: "var(--font-title)" }}
          >
            Pointer
          </h1>
          <p
            className="mt-3 font-sans text-sm uppercase tracking-wide text-[var(--color-fg-muted)]"
            style={{ fontVariant: "small-caps", letterSpacing: "0.14em" }}
          >
            Your projections. Your scoring. Your draft board.
          </p>
        </header>

        <p className="mt-10 text-center font-sans text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-fg-subtle)]">
          Choose your sport to get started
        </p>

        <div className="mt-5 grid gap-4 font-sans sm:grid-cols-2">
          {sportCards.map(({ sport, title, description, glyph }) => (
            <button
              key={sport}
              type="button"
              onClick={() => completeOnboarding(sport)}
              className="group flex flex-col items-start gap-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-base)] p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-md focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
            >
              <span className="text-[var(--color-fg-muted)] transition-colors group-hover:text-[var(--color-accent)]">
                {glyph}
              </span>
              <span
                className="text-2xl font-bold text-[var(--color-fg-default)]"
                style={{ fontFamily: "var(--font-title)" }}
              >
                {title}
              </span>
              <span className="text-sm leading-relaxed text-[var(--color-fg-muted)]">
                {description}
              </span>
              <span className="mt-auto text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
                Get started →
              </span>
            </button>
          ))}
        </div>

        <p className="mt-10 text-center font-sans text-xs leading-relaxed text-[var(--color-fg-subtle)]">
          Free and private — everything runs in your browser.
          <br />
          You can add leagues for either sport anytime, and switch from the header.
        </p>
      </main>
    </div>
  );
}
