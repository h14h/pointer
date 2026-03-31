import type { RankedPlayer } from "@/types";

export type PlayerView = "all" | "batters" | "pitchers";
export type DraftFilter = "all" | "available" | "drafted" | "keepers";

export type LeaderboardRow = RankedPlayer & {
  searchText: string;
  positionTokens: string[];
};
