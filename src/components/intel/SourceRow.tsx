"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/input";
import {
  getProjectionGroupDisplayName,
  getProjectionGroupPlayerCounts,
  getProjectionGroupSourceLabel,
  isProtectedProjectionGroup,
  leaguesUsingProjectionGroup,
} from "@/lib/projections";
import type { League, ProjectionGroup } from "@/types";
import { EligibilityImportControl, type EligibilityImportState } from "./EligibilityImport";

function formatImportedAt(timestamp?: string): string | null {
  if (!timestamp) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export interface SourceRowProps {
  group: ProjectionGroup;
  /** The league whose lens the library is being viewed through */
  league: League;
  leagues: League[];
  /** The full library — needed to resolve fallback users for "used by" */
  allGroups: ProjectionGroup[];
  /** This group resolves as the current league's source */
  isResolved: boolean;
  /** The league explicitly selected this group (vs fallback resolution) */
  isExplicit: boolean;
  /** Group sport matches the league — selection actions are live */
  selectable: boolean;
  eligibility: EligibilityImportState;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

/**
 * One ledger row in a sport library: name (inline-renamable for uploads),
 * kind chip, data counts, USED BY league chips, and the selection/delete
 * actions for the current league.
 */
export function SourceRow({
  group,
  league,
  leagues,
  allGroups,
  isResolved,
  isExplicit,
  selectable,
  eligibility,
  onSelect,
  onDelete,
  onRename,
}: SourceRowProps) {
  const [renameDraft, setRenameDraft] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isProtected = isProtectedProjectionGroup(group);
  const displayName = getProjectionGroupDisplayName(group);
  const kindLabel = getProjectionGroupSourceLabel(group);
  const counts = getProjectionGroupPlayerCounts(group);
  const usedBy = leaguesUsingProjectionGroup(group, leagues, allGroups);
  const isBaseball = group.sport !== "football";
  const importedAtLabel = formatImportedAt(group.eligibilityImportedAt);

  const metaParts =
    group.sport === "football"
      ? [`${counts.footballPlayers} players`]
      : [
          `${counts.batters} batters`,
          `${counts.pitchers} pitchers`,
          ...(counts.twoWayPlayers > 0 ? [`${counts.twoWayPlayers} two-way`] : []),
        ];
  if (isBaseball) {
    if (group.eligibilityImportedAt) {
      const season = group.eligibilitySeason ?? group.eligibilityImportSeason;
      metaParts.push(
        `eligibility${season ? ` season ${season}` : " imported"}${
          importedAtLabel ? ` (${importedAtLabel})` : ""
        }`,
      );
    } else {
      metaParts.push("eligibility not imported");
    }
  }

  return (
    <div className="px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          {renameDraft === null ? (
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-fg-default)]">
                {displayName}
              </h3>
              <Badge
                variant="neutral"
                className={kindLabel === "Upload" ? "border-dashed" : undefined}
              >
                {kindLabel}
              </Badge>
              {!isProtected ? (
                <button
                  type="button"
                  className="stamp cursor-pointer underline decoration-dotted underline-offset-2 hover:text-[var(--color-fg-default)]"
                  onClick={() => setRenameDraft(group.name)}
                >
                  rename
                </button>
              ) : null}
            </div>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                onRename(renameDraft);
                setRenameDraft(null);
              }}
            >
              <Input
                inputSize="sm"
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
                className="w-56"
                aria-label={`Rename ${displayName}`}
              />
              <Button type="submit" variant="primary" size="sm">
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRenameDraft(null)}>
                Cancel
              </Button>
            </form>
          )}

          <p className="font-data mt-1.5 text-[11px] text-[var(--color-fg-muted)]">
            {metaParts.join(" · ")}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="stamp">used by</span>
            {usedBy.length === 0 ? (
              <span className="stamp text-[var(--color-fg-subtle)]">nobody yet</span>
            ) : (
              usedBy.map((user) => (
                <Chip key={user.id} tone={user.id === league.id ? "accent" : "neutral"}>
                  {user.name}
                </Chip>
              ))
            )}
          </div>

          {isBaseball ? (
            <EligibilityImportControl group={group} importState={eligibility} />
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {selectable ? (
            isResolved ? (
              <>
                {!isExplicit ? <span className="stamp">via fallback</span> : null}
                <Chip tone="accent">Selected</Chip>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={onSelect}>
                Use for this league
              </Button>
            )
          ) : (
            <span className="stamp">
              for your {group.sport === "football" ? "football" : "baseball"} leagues
            </span>
          )}
          {!isProtected ? (
            confirmingDelete ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setConfirmingDelete(false);
                    onDelete();
                  }}
                >
                  Confirm delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="iconSubtle"
                size="icon"
                aria-label={`Delete ${displayName}`}
                onClick={() => setConfirmingDelete(true)}
              >
                ✕
              </Button>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
