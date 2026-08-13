"use client";

import { HorizonMark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";
import { useStore } from "@/store";
import type { Sport } from "@/types";

const SPORTS: { value: Sport; label: string }[] = [
  { value: "football", label: "Football" },
  { value: "baseball", label: "Baseball" },
];

/**
 * First-run hero — shown once, before any league exists in earnest.
 * Picking a sport replaces the pristine placeholder league and flips the
 * onboarding flag; the normal league grid renders from then on.
 */
export function OnboardingHero() {
  const { completeOnboarding } = useStore();

  return (
    <PageContainer as="main" className="flex flex-col items-center py-24 text-center">
      <span className="inline-flex items-center gap-3">
        <HorizonMark className="size-10 text-[var(--color-accent)]" />
        <span className="font-data text-4xl font-semibold tracking-tight">
          DraftSpa
        </span>
      </span>
      <p className="stamp mt-3 normal-case tracking-[0.08em]">
        league-specific draft boards
      </p>

      <p className="mt-8 max-w-md text-sm leading-relaxed text-[var(--color-fg-muted)]">
        Create your first league. DraftSpa builds the board around your
        scoring, roster, projections, and draft order. Football is ready
        for this NFL season; baseball is here if you need it.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {SPORTS.map((option) => (
          <Button
            key={option.value}
            variant={option.value === "football" ? "primary" : "secondary"}
            size="md"
            onClick={() => completeOnboarding(option.value)}
            className={
              option.value === "football"
                ? "px-6 py-2.5"
                : "border-[var(--color-fg-default)] px-6 py-2.5 text-[var(--color-fg-default)]"
            }
          >
            {option.label}
          </Button>
        ))}
      </div>
    </PageContainer>
  );
}
