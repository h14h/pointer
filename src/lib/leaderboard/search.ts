import type { Player } from "@/types";

export function normalizePlayerSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buildPlayerSearchText(player: Pick<Player, "Name" | "Team">): string {
  return normalizePlayerSearchText(`${player.Name} ${player.Team}`);
}

export function matchesPlayerSearch(
  player: Pick<Player, "Name" | "Team">,
  search: string
): boolean {
  const normalizedSearch = normalizePlayerSearchText(search.trim());
  if (!normalizedSearch) return true;
  return buildPlayerSearchText(player).includes(normalizedSearch);
}
