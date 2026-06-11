import type { ProjectionGroup, ProjectionGroupSource, Sport } from "@/types";

export const UPLOAD_PROJECTION_SOURCE: ProjectionGroupSource = { kind: "upload" };

export function getDefaultEligibilityImportSeason(group: ProjectionGroup): number {
  if (group.source.kind === "public-dataset") {
    return group.source.season;
  }
  return new Date().getFullYear();
}

export function isProtectedProjectionGroup(group: ProjectionGroup): boolean {
  return group.source.kind === "public-dataset" && group.source.protected;
}

export function getProjectionGroupFallbackId(groups: ProjectionGroup[]): string | null {
  return groups.find(isProtectedProjectionGroup)?.id ?? groups[0]?.id ?? null;
}

/**
 * Projection sources are scoped to a SPORT and shared by every league of that
 * sport; a league merely selects which source it uses (league.projectionGroupId).
 *
 * Resolution order:
 *   1. the league's own selection, when it exists and matches the league's sport
 *   2. the sport-scoped fallback (protected public dataset first, then any
 *      source of that sport)
 */
export function resolveProjectionGroupForLeague(
  league: { sport: Sport; projectionGroupId?: string | null },
  groups: ProjectionGroup[],
): ProjectionGroup | null {
  // Tolerate unnormalized leagues (legacy persisted data defaults to baseball)
  const sport: Sport = league.sport === "football" ? "football" : "baseball";
  const sportGroups = groups.filter((group) => (group.sport ?? "baseball") === sport);
  const selected = sportGroups.find((group) => group.id === league.projectionGroupId);
  if (selected) return selected;
  const fallbackId = getProjectionGroupFallbackId(sportGroups);
  return sportGroups.find((group) => group.id === fallbackId) ?? null;
}

/**
 * Leagues using a given source — the Intel library's "used by" readout.
 * Counts FALLBACK users too (league.projectionGroupId null/dangling but the
 * source is what resolution lands on), so deleting a source every league
 * leans on doesn't read as "used by nobody".
 */
export function leaguesUsingProjectionGroup<
  L extends { sport: Sport; projectionGroupId?: string | null },
>(group: ProjectionGroup, leagues: L[], allGroups: ProjectionGroup[]): L[] {
  return leagues.filter(
    (league) => resolveProjectionGroupForLeague(league, allGroups)?.id === group.id,
  );
}

export function normalizeProjectionGroup(group: ProjectionGroup): ProjectionGroup {
  const source = group.source ?? UPLOAD_PROJECTION_SOURCE;
  const sport =
    group.sport === "football" || (group.footballPlayers?.length ?? 0) > 0
      ? "football"
      : "baseball";
  return {
    ...group,
    source,
    sport,
    batters: group.batters ?? [],
    pitchers: group.pitchers ?? [],
    twoWayPlayers: group.twoWayPlayers ?? [],
    eligibilityImportSeason:
      Number.isFinite(group.eligibilityImportSeason) && (group.eligibilityImportSeason ?? 0) > 0
        ? Math.round(group.eligibilityImportSeason as number)
        : getDefaultEligibilityImportSeason({ ...group, source }),
  };
}

export function normalizeProjectionGroups(groups: ProjectionGroup[]): ProjectionGroup[] {
  return groups.map(normalizeProjectionGroup);
}

export function getProjectionGroupDisplayName(group: ProjectionGroup | null | undefined): string {
  if (!group) return "Projections";
  if (group.source.kind === "public-dataset" && group.source.slug === "historical-2025") {
    return "2025 Leaders";
  }
  return group.name;
}

export function getProjectionGroupSourceLabel(group: ProjectionGroup): "Built-in" | "Upload" {
  return group.source.kind === "public-dataset" ? "Built-in" : "Upload";
}

export function getProjectionGroupPlayerCounts(group: ProjectionGroup) {
  return {
    batters: group.batters.length,
    pitchers: group.pitchers.length,
    twoWayPlayers: group.twoWayPlayers.length,
    footballPlayers: group.footballPlayers?.length ?? 0,
  };
}
