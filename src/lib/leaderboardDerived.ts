import type { SortingState } from "@tanstack/react-table";
import { calculatePAR } from "@/lib/calculatePAR";
import { calculatePlayerPoints } from "@/lib/calculatePoints";
import { POSITION_ORDER } from "@/lib/eligibility";
import { isValidBaseballIp } from "@/lib/ipMath";
import { buildPlayerSearchText, normalizePlayerSearchText } from "@/lib/playerSearch";
import type {
  DraftState,
  LeagueSettings,
  Player,
  ProjectionGroup,
  RankedPlayer,
  ScoringSettings,
} from "@/types";

export type PlayerView = "all" | "batters" | "pitchers";
export type DraftFilter = "all" | "available" | "drafted" | "keepers";
const MIN_BATTER_PA = 10;
const MIN_PITCHER_IP = 5;

export type LeaderboardRow = RankedPlayer & {
  searchText: string;
  positionTokens: string[];
};

type BuildBaseRankedPlayersArgs = {
  activeGroup: ProjectionGroup | null;
  playerView: PlayerView;
  scoringSettings: ScoringSettings;
  leagueSettings: LeagueSettings;
  draftState: DraftState;
  mergeTwoWayRankings: boolean;
};

type FilterRankedPlayersArgs = {
  rows: LeaderboardRow[];
  selectedPositions: ReadonlySet<string>;
  isDraftMode: boolean;
  draftFilter: DraftFilter;
  search: string;
};

function getPlayersForView(
  activeGroup: ProjectionGroup | null,
  view: PlayerView,
  mergeTwoWayRankings: boolean
): Player[] {
  if (!activeGroup) return [];

  const batters = activeGroup.batters;
  const pitchers = activeGroup.pitchers;
  const twoWayPlayers = activeGroup.twoWayPlayers;

  const canMergeTwoWay =
    activeGroup.batterIdSource !== null &&
    activeGroup.batterIdSource !== "generated" &&
    activeGroup.pitcherIdSource !== null &&
    activeGroup.pitcherIdSource !== "generated";

  const useMergedTwoWay =
    canMergeTwoWay && mergeTwoWayRankings && twoWayPlayers.length > 0;
  const twoWayIds = new Set(twoWayPlayers.map((player) => player._id));

  if (view === "all") {
    if (useMergedTwoWay) {
      return [
        ...batters.filter((player) => !twoWayIds.has(player._id)),
        ...pitchers.filter((player) => !twoWayIds.has(player._id)),
        ...twoWayPlayers,
      ];
    }
    if (batters.length === 0 && pitchers.length === 0 && twoWayPlayers.length > 0) {
      return [...twoWayPlayers];
    }
    return [...batters, ...pitchers];
  }

  if (view === "batters") {
    if (useMergedTwoWay) {
      return [
        ...batters.filter((player) => !twoWayIds.has(player._id)),
        ...twoWayPlayers,
      ];
    }
    if (batters.length === 0 && twoWayPlayers.length > 0) {
      return [...twoWayPlayers];
    }
    return [...batters];
  }

  if (useMergedTwoWay) {
    return [
      ...pitchers.filter((player) => !twoWayIds.has(player._id)),
      ...twoWayPlayers,
    ];
  }
  if (pitchers.length === 0 && twoWayPlayers.length > 0) {
    return [...twoWayPlayers];
  }
  return [...pitchers];
}

function meetsBatterProjectionMinimum(player: Player): boolean {
  if (player._type === "batter") return player.PA >= MIN_BATTER_PA;
  if (player._type === "two-way") return player._battingStats.PA >= MIN_BATTER_PA;
  return false;
}

function meetsPitcherProjectionMinimum(player: Player): boolean {
  if (player._type === "pitcher") return player.IP >= MIN_PITCHER_IP;
  if (player._type === "two-way") return player._pitchingStats.IP >= MIN_PITCHER_IP;
  return false;
}

function meetsProjectionMinimumForView(player: Player, view: PlayerView): boolean {
  if (view === "batters") return meetsBatterProjectionMinimum(player);
  if (view === "pitchers") return meetsPitcherProjectionMinimum(player);
  return meetsBatterProjectionMinimum(player) || meetsPitcherProjectionMinimum(player);
}

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

export function getUseBaseballIp(activeGroup: ProjectionGroup | null): boolean {
  if (!activeGroup) return false;

  const pitcherIps = [...activeGroup.pitchers, ...activeGroup.twoWayPlayers]
    .map((player) => {
      if (player._type === "two-way") {
        return player._pitchingStats.IP;
      }
      if (player._type === "pitcher") {
        return player.IP;
      }
      return null;
    })
    .filter((ip): ip is number => typeof ip === "number");

  if (pitcherIps.length === 0) return false;
  return pitcherIps.every((ip) => isValidBaseballIp(ip));
}

export function buildBaseRankedPlayers({
  activeGroup,
  playerView,
  scoringSettings,
  leagueSettings,
  draftState,
  mergeTwoWayRankings,
}: BuildBaseRankedPlayersArgs): RankedPlayer[] {
  if (!activeGroup) return [];

  const useBaseballIp = getUseBaseballIp(activeGroup);
  const allPlayersForPar = getPlayersForView(activeGroup, "all", mergeTwoWayRankings)
    .filter((player) => meetsProjectionMinimumForView(player, "all"));
  const parRankedPlayers = calculatePAR(
    allPlayersForPar.map((player) => ({
      player,
      projectedPoints: calculatePlayerPoints(
        player,
        scoringSettings,
        "all",
        useBaseballIp
      ),
      par: 0,
      isDrafted: false,
      isKeeper: false,
    })) as RankedPlayer[],
    leagueSettings
  );

  const parByPlayerId = new Map(
    parRankedPlayers.map((rankedPlayer) => [rankedPlayer.player._id, rankedPlayer.par])
  );
  const viewPlayers = getPlayersForView(activeGroup, playerView, mergeTwoWayRankings)
    .filter((player) => meetsProjectionMinimumForView(player, playerView));

  return viewPlayers.map((player) => ({
    player,
    projectedPoints: calculatePlayerPoints(
      player,
      scoringSettings,
      playerView,
      useBaseballIp
    ),
    par: parByPlayerId.get(player._id) ?? 0,
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
  }));
}

export function buildFilterMetadata(rows: RankedPlayer[]): LeaderboardRow[] {
  return rows.map((row) => {
    const positionTokens = [
      ...(row.player.eligibility?.eligiblePositions ?? []),
      ...(row.player.eligibility?.isSP ? ["SP"] : []),
      ...(row.player.eligibility?.isRP ? ["RP"] : []),
    ];

    return {
      ...row,
      searchText: buildPlayerSearchText(row.player),
      positionTokens,
    };
  });
}

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

function getStatValue(row: LeaderboardRow, columnId: string): number | null {
  if (row.player._type === "pitcher") {
    switch (columnId) {
      case "IP":
        return row.player.IP;
      case "SO_P":
        return row.player.SO;
      case "H_P":
        return row.player.H;
      case "ER":
        return row.player.ER;
      case "HR_P":
        return row.player.HR;
      case "BB_P":
        return row.player.BB;
      case "HBP_P":
        return row.player.HBP;
      case "W":
        return row.player.W;
      case "L":
        return row.player.L;
      case "QS":
        return row.player.QS;
      case "SV":
        return row.player.SV;
      case "HLD":
        return row.player.HLD;
      case "BS":
        return row.player.BS;
      case "CG":
        return row.player.CG;
      case "ShO":
        return row.player.ShO;
      case "ERA":
        return row.player.ERA;
      case "WHIP":
        return row.player.WHIP;
      default:
        return null;
    }
  }

  if (row.player._type === "two-way") {
    switch (columnId) {
      case "H":
        return row.player._battingStats.H;
      case "1B":
        return row.player._battingStats["1B"];
      case "2B":
        return row.player._battingStats["2B"];
      case "3B":
        return row.player._battingStats["3B"];
      case "TB":
        return (
          row.player._battingStats["1B"] +
          row.player._battingStats["2B"] * 2 +
          row.player._battingStats["3B"] * 3 +
          row.player._battingStats.HR * 4
        );
      case "HR":
        return row.player._battingStats.HR;
      case "R":
        return row.player._battingStats.R;
      case "RBI":
        return row.player._battingStats.RBI;
      case "BB":
        return row.player._battingStats.BB;
      case "HBP":
        return row.player._battingStats.HBP;
      case "SO":
        return row.player._battingStats.SO;
      case "SB":
        return row.player._battingStats.SB;
      case "CS":
        return row.player._battingStats.CS;
      case "SF":
        return row.player._battingStats.SF;
      case "GDP":
        return row.player._battingStats.GDP;
      case "AVG":
        return row.player._battingStats.AVG;
      case "IP":
        return row.player._pitchingStats.IP;
      case "SO_P":
        return row.player._pitchingStats.SO;
      case "H_P":
        return row.player._pitchingStats.H;
      case "ER":
        return row.player._pitchingStats.ER;
      case "HR_P":
        return row.player._pitchingStats.HR;
      case "BB_P":
        return row.player._pitchingStats.BB;
      case "HBP_P":
        return row.player._pitchingStats.HBP;
      case "W":
        return row.player._pitchingStats.W;
      case "L":
        return row.player._pitchingStats.L;
      case "QS":
        return row.player._pitchingStats.QS;
      case "SV":
        return row.player._pitchingStats.SV;
      case "HLD":
        return row.player._pitchingStats.HLD;
      case "BS":
        return row.player._pitchingStats.BS;
      case "CG":
        return row.player._pitchingStats.CG;
      case "ShO":
        return row.player._pitchingStats.ShO;
      case "ERA":
        return row.player._pitchingStats.ERA;
      case "WHIP":
        return row.player._pitchingStats.WHIP;
      default:
        return null;
    }
  }

  switch (columnId) {
    case "H":
      return row.player.H;
    case "1B":
      return row.player["1B"];
    case "2B":
      return row.player["2B"];
    case "3B":
      return row.player["3B"];
    case "TB":
      return row.player["1B"] + row.player["2B"] * 2 + row.player["3B"] * 3 + row.player.HR * 4;
    case "HR":
      return row.player.HR;
    case "R":
      return row.player.R;
    case "RBI":
      return row.player.RBI;
    case "BB":
      return row.player.BB;
    case "HBP":
      return row.player.HBP;
    case "SO":
      return row.player.SO;
    case "SB":
      return row.player.SB;
    case "CS":
      return row.player.CS;
    case "SF":
      return row.player.SF;
    case "GDP":
      return row.player.GDP;
    case "AVG":
      return row.player.AVG;
    default:
      return null;
  }
}

function getSortValue(row: LeaderboardRow, columnId: string): number | string | null {
  switch (columnId) {
    case "ADP":
      return row.player.ADP;
    case "player.Name":
    case "player_Name":
      return row.player.Name;
    case "player.Team":
    case "player_Team":
      return row.player.Team;
    case "player._type":
    case "player__type":
      return row.player._type;
    case "eligibility":
      return formatEligibilityForLeaderboard(row.player);
    case "projectedPoints":
      return row.projectedPoints;
    case "par":
      return row.par;
    default:
      return getStatValue(row, columnId);
  }
}

function compareSortValues(
  left: number | string | null,
  right: number | string | null
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortLeaderboardRows(
  rows: LeaderboardRow[],
  sorting: SortingState
): LeaderboardRow[] {
  if (sorting.length === 0) return [...rows];

  return [...rows].sort((left, right) => {
    for (const sortEntry of sorting) {
      const comparison = compareSortValues(
        getSortValue(left, sortEntry.id),
        getSortValue(right, sortEntry.id)
      );

      if (comparison !== 0) {
        return sortEntry.desc ? -comparison : comparison;
      }
    }

    return left.player._id.localeCompare(right.player._id);
  });
}
