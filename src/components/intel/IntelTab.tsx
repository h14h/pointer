"use client";

import { useState } from "react";
import { CsvUpload } from "@/components/CsvUpload";
import { FootballCsvUpload } from "@/components/FootballCsvUpload";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useLeagueProjectionGroup, useRouteLeague } from "@/store/selectors";
import { useStore } from "@/store";
import type { League, ProjectionGroup, Sport } from "@/types";
import { useEligibilityImport, type EligibilityImportState } from "./EligibilityImport";
import { SourceRow } from "./SourceRow";

const SPORT_LABELS: Record<Sport, string> = {
  baseball: "baseball",
  football: "football",
};

/**
 * The Intel tab: the sport-scoped projection library. Sources are uploaded
 * once per sport and shared by every league of that sport; the current
 * league merely selects which source it uses (league.projectionGroupId).
 * The library is shown through the current league's lens — its own sport
 * first, with live selection/upload actions; the other sport read-only.
 */
export function IntelTab() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const league = useRouteLeague();
  const resolvedGroup = useLeagueProjectionGroup(league);
  const {
    projectionGroups,
    leagues,
    setLeagueProjectionGroup,
    removeProjectionGroup,
    renameProjectionGroup,
  } = useStore();
  const eligibility = useEligibilityImport();

  if (!league) return null;
  const isFootball = league.sport === "football";
  const sports: Sport[] = isFootball ? ["football", "baseball"] : ["baseball", "football"];

  return (
    <div className="max-w-4xl">
      {sports.map((sport) => (
        <LibrarySection
          key={sport}
          sport={sport}
          league={league}
          leagues={leagues}
          groups={projectionGroups.filter((group) => group.sport === sport)}
          allGroups={projectionGroups}
          resolvedGroupId={resolvedGroup?.id ?? null}
          eligibility={eligibility}
          onOpenUpload={() => setUploadOpen(true)}
          onSelect={(groupId) => setLeagueProjectionGroup(league.id, groupId)}
          onDelete={removeProjectionGroup}
          onRename={renameProjectionGroup}
        />
      ))}

      {isFootball ? (
        <FootballCsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      ) : (
        <CsvUpload isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      )}
    </div>
  );
}

interface LibrarySectionProps {
  sport: Sport;
  league: League;
  leagues: League[];
  groups: ProjectionGroup[];
  /** The full library — SourceRow resolves fallback users for "used by" */
  allGroups: ProjectionGroup[];
  resolvedGroupId: string | null;
  eligibility: EligibilityImportState;
  onOpenUpload: () => void;
  onSelect: (groupId: string) => void;
  onDelete: (groupId: string) => void;
  onRename: (groupId: string, name: string) => void;
}

/** One sport's library: stamped header, source ledger, upload affordance. */
function LibrarySection({
  sport,
  league,
  leagues,
  groups,
  allGroups,
  resolvedGroupId,
  eligibility,
  onOpenUpload,
  onSelect,
  onDelete,
  onRename,
}: LibrarySectionProps) {
  const sportLabel = SPORT_LABELS[sport];
  const isOwnSport = sport === league.sport;

  return (
    <section className="mt-10 first:mt-0">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="stamp-strong">{sportLabel} library</h2>
        <span className="stamp">
          one library per sport — every {sportLabel} league draws from it
        </span>
      </div>

      {groups.length === 0 ? (
        <Panel className="border-dashed py-10 text-center">
          <p className="stamp">empty library</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-fg-muted)]">
            Upload once — every {sportLabel} league can use it.
          </p>
          {isOwnSport ? (
            <Button variant="primary" size="md" className="mt-4" onClick={onOpenUpload}>
              Upload CSV
            </Button>
          ) : (
            <p className="stamp mt-3 text-[var(--color-fg-subtle)]">
              open a {sportLabel} league to upload here
            </p>
          )}
        </Panel>
      ) : (
        <>
          <Panel padding="none" className="divide-y divide-[var(--color-border-soft)]">
            {groups.map((group) => (
              <SourceRow
                key={group.id}
                group={group}
                league={league}
                leagues={leagues}
                allGroups={allGroups}
                isResolved={isOwnSport && group.id === resolvedGroupId}
                isExplicit={league.projectionGroupId === group.id}
                selectable={isOwnSport}
                eligibility={eligibility}
                onSelect={() => onSelect(group.id)}
                onDelete={() => onDelete(group.id)}
                onRename={(name) => onRename(group.id, name)}
              />
            ))}
          </Panel>

          {isOwnSport ? (
            <button
              type="button"
              onClick={onOpenUpload}
              className="font-data mt-2.5 w-full cursor-pointer rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border-default)] px-4 py-5 text-center text-[11.5px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Upload CSV — lands in the {sportLabel} library, available to every {sportLabel}{" "}
              league
            </button>
          ) : (
            <p className="font-data mt-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-soft)] px-4 py-3 text-center text-[11px] text-[var(--color-fg-subtle)]">
              uploads land here from any {sportLabel} league&apos;s Intel tab
            </p>
          )}
        </>
      )}
    </section>
  );
}
