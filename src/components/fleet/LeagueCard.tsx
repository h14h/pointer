"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  getDraftPickContext,
  getNextOpenPickIndex,
  hasManualDraftActivity,
} from "@/lib/draft";
import { beginNightTransition } from "@/lib/nightTransition";
import { getProjectionGroupDisplayName } from "@/lib/projections";
import type { League, ProjectionGroup } from "@/types";
import { leagueReadiness } from "./leagueReadiness";

const sportLabels: Record<League["sport"], string> = {
  baseball: "Baseball",
  football: "Football",
};

/** Amber "draft in progress · pick N" chip when picks have been logged. */
function DraftProgressChip({ league }: { league: League }) {
  if (!hasManualDraftActivity(league.draftState)) return null;
  const leagueSize = league.leagueSettings.leagueSize;
  const openPickIndex = getNextOpenPickIndex(
    leagueSize,
    league.draftState.pickIndex,
    league.draftState.format,
    league.draftState
  );
  const context = getDraftPickContext(
    leagueSize,
    openPickIndex,
    league.draftState.format
  );
  return (
    <Chip tone="warning">
      draft in progress · pick {context.overallPick}
    </Chip>
  );
}

/**
 * One league's mission card on the fleet — printed chip row, name, vitals,
 * readiness bar, and the two ways in (workspace by day, draft by night).
 */
export function LeagueCard({
  league,
  group,
}: {
  league: League;
  group: ProjectionGroup | null;
}) {
  const router = useRouter();
  const checks = leagueReadiness(league, group);
  const done = checks.filter((check) => check.done).length;
  const total = checks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const low = done <= total / 2;

  return (
    <article className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-soft)] bg-[var(--color-surface-base)] p-5 shadow-[3px_3px_0_color-mix(in_srgb,var(--color-fg-default)_5%,transparent)] transition-colors hover:border-[var(--color-border-strong)]">
      <div className="flex flex-wrap items-center gap-2">
        <Chip>{sportLabels[league.sport]}</Chip>
        <DraftProgressChip league={league} />
      </div>

      <h2 className="text-xl font-bold leading-tight">{league.name}</h2>

      <p className="font-data text-xs text-[var(--color-fg-muted)]">
        {league.leagueSettings.leagueSize} teams ·{" "}
        {group ? (
          getProjectionGroupDisplayName(group)
        ) : (
          <span className="text-[var(--color-warning)]">
            no source — visit intel
          </span>
        )}
      </p>

      <div
        className="mt-2 flex items-center gap-2.5"
        title={checks
          .map((check) => `${check.done ? "✓" : "·"} ${check.label}`)
          .join("\n")}
      >
        <div className="h-1.5 flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border-soft)] bg-[var(--color-surface-raised)]">
          <div
            className={
              low
                ? "h-full bg-[var(--color-warning)]"
                : "h-full bg-[var(--color-accent)]"
            }
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="stamp whitespace-nowrap">
          {done} of {total} prepped
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/league/${league.id}/plan`}
          prefetch={false}
          className="inline-flex min-h-8 items-center justify-center gap-2 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-surface-base)] px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-widest text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-fg-default)]"
        >
          Open workspace
        </Link>
        <Button
          variant="inverse"
          size="sm"
          onClick={async () => {
            await beginNightTransition(true);
            router.push(`/league/${league.id}/draft`);
          }}
        >
          ☾ Draft night
        </Button>
      </div>
    </article>
  );
}
