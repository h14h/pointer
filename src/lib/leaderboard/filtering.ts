import { normalizePlayerSearchText } from "./search";
import type { LeaderboardRow, DraftFilter } from "./types";

type FilterRankedPlayersArgs = {
  rows: LeaderboardRow[];
  selectedPositions: ReadonlySet<string>;
  isDraftMode: boolean;
  draftFilter: DraftFilter;
  search: string;
};

export function filterRankedPlayers({
  rows,
  selectedPositions,
  isDraftMode,
  draftFilter,
  search,
}: FilterRankedPlayersArgs): LeaderboardRow[] {
  const trimmedSearch = normalizePlayerSearchText(search.trim());

  return rows.filter((row) => {
    if (selectedPositions.size > 0) {
      let matchesPosition = false;
      for (const position of selectedPositions) {
        if (row.positionTokens.includes(position)) {
          matchesPosition = true;
          break;
        }
      }

      if (!matchesPosition) {
        return false;
      }
    }

    if (isDraftMode && draftFilter !== "all") {
      if (draftFilter === "available" && (row.isDrafted || row.isKeeper)) {
        return false;
      }
      if (draftFilter === "drafted" && !row.isDrafted) {
        return false;
      }
      if (draftFilter === "keepers" && !row.isKeeper) {
        return false;
      }
    }

    if (trimmedSearch.length > 0 && !row.searchText.includes(trimmedSearch)) {
      return false;
    }

    return true;
  });
}
