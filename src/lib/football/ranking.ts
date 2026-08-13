import type {
  DraftState,
  FootballLeagueConfig,
  FootballPlayer,
  FootballPosition,
  LeaguePlayerOverrides,
  ProjectionGroup,
} from "@/types";
import { calculateFootballPoints } from "./scoring";
import { calculateFootballPAR } from "./par";
import { normalizePlayerSearchText } from "@/lib/leaderboard/search";
import { applyFootballStatOverrides } from "@/lib/overrides";

export type FootballPositionFilter = "ALL" | FootballPosition | "FLEX";
export type FootballDraftFilter = "all" | "available" | "drafted" | "keepers";

export interface FootballRankedPlayer {
  player: FootballPlayer;
  projectedPoints: number;
  par: number;
  isDrafted: boolean;
  isKeeper: boolean;
  draftedTeamIndex?: number;
  keeperTeamIndex?: number;
  keeperSlotIndex?: number | null;
  searchText: string;
  hasOverrides: boolean;
}

export type FootballSortKey = "points" | "par" | "adp" | "name";

type BuildFootballRankedPlayersArgs = {
  activeGroup: ProjectionGroup | null;
  config: FootballLeagueConfig;
  leagueSize: number;
  draftState: DraftState;
  playerStatOverrides?: LeaguePlayerOverrides;
};

const normalizeSearchText = normalizePlayerSearchText;

export function buildFootballRankedPlayers({
  activeGroup,
  config,
  leagueSize,
  draftState,
  playerStatOverrides,
}: BuildFootballRankedPlayersArgs): FootballRankedPlayer[] {
  const players = activeGroup?.footballPlayers ?? [];
  if (players.length === 0) return [];

  const scored = players.map((uploaded) => {
    const override = playerStatOverrides?.[uploaded._id];
    const player = applyFootballStatOverrides(uploaded, override);
    return {
      player,
      projectedPoints: calculateFootballPoints(player, config.scoring),
      hasOverrides: Boolean(override && Object.keys(override).length > 0),
    };
  });

  const parById = calculateFootballPAR(scored, config.roster, leagueSize);

  return scored.map(({ player, projectedPoints, hasOverrides }) => ({
    player,
    projectedPoints,
    par: parById.get(player._id) ?? 0,
    isDrafted: draftState.draftedByTeam[player._id] !== undefined,
    isKeeper: draftState.keeperByTeam[player._id] !== undefined,
    draftedTeamIndex:
      draftState.draftedByTeam[player._id] !== undefined
        ? Number(draftState.draftedByTeam[player._id])
        : undefined,
    keeperTeamIndex:
      draftState.keeperByTeam[player._id] !== undefined
        ? Number(draftState.keeperByTeam[player._id])
        : undefined,
    keeperSlotIndex: draftState.keeperSlotByPlayer?.[player._id] ?? null,
    searchText: normalizeSearchText(`${player.Name} ${player.Team} ${player.Position}`),
    hasOverrides,
  }));
}

export function filterFootballRankedPlayers(
  rows: FootballRankedPlayer[],
  positionFilter: FootballPositionFilter,
  draftFilter: FootballDraftFilter,
  search: string
): FootballRankedPlayer[] {
  const normalizedSearch = normalizeSearchText(search.trim());

  return rows.filter((row) => {
    if (positionFilter === "FLEX") {
      if (!["RB", "WR", "TE"].includes(row.player.Position)) return false;
    } else if (positionFilter !== "ALL" && row.player.Position !== positionFilter) {
      return false;
    }

    if (draftFilter === "available" && (row.isDrafted || row.isKeeper)) return false;
    if (draftFilter === "drafted" && !row.isDrafted) return false;
    if (draftFilter === "keepers" && !row.isKeeper) return false;

    if (normalizedSearch !== "" && !row.searchText.includes(normalizedSearch)) return false;

    return true;
  });
}

export function sortFootballRankedPlayers(
  rows: FootballRankedPlayer[],
  sortKey: FootballSortKey,
  direction: "asc" | "desc"
): FootballRankedPlayer[] {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    switch (sortKey) {
      case "name":
        return multiplier * a.player.Name.localeCompare(b.player.Name);
      case "adp": {
        // Null ADP always sorts last regardless of direction
        const aAdp = a.player.ADP;
        const bAdp = b.player.ADP;
        if (aAdp === null && bAdp === null) return 0;
        if (aAdp === null) return 1;
        if (bAdp === null) return -1;
        return multiplier * (aAdp - bAdp);
      }
      case "par":
        return multiplier * (a.par - b.par);
      case "points":
      default:
        return multiplier * (a.projectedPoints - b.projectedPoints);
    }
  });
}
