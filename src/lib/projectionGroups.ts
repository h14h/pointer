import type { ProjectionGroup } from "@/types";

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
