import type { ProjectionGroup, ProjectionGroupSource } from "@/types";

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

export function normalizeProjectionGroup(group: ProjectionGroup): ProjectionGroup {
  const source = group.source ?? UPLOAD_PROJECTION_SOURCE;
  return {
    ...group,
    source,
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
  };
}
