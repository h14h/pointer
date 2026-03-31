import type { Player } from "@/types";
import { POSITION_ORDER } from "./rules";

export function formatEligibilityForLeaderboard(player: Player): string {
  const eligibility = player.eligibility;
  if (!eligibility) return "-";

  const parts: string[] = [];
  const eligibleSet = new Set(eligibility.eligiblePositions);
  const orderedPositions = POSITION_ORDER.filter((pos) => eligibleSet.has(pos));
  if (orderedPositions.length > 0) {
    parts.push(orderedPositions.join(","));
  }
  if (eligibility.isSP) parts.push("SP");
  if (eligibility.isRP) parts.push("RP");

  return parts.length > 0 ? parts.join(" / ") : "-";
}
