import { calculatePAR } from "./par";
import { calculatePlayerPoints, isValidBaseballIp } from "@/lib/scoring";
import { buildPlayerSearchText } from "./search";
import type {
  DraftState,
  LeagueSettings,
  Player,
  ProjectionGroup,
  RankedPlayer,
  ScoringSettings,
} from "@/types";
import type { LeaderboardRow, PlayerView } from "./types";

const MIN_BATTER_PA = 10;
const MIN_PITCHER_IP = 5;

type BuildBaseRankedPlayersArgs = {
  activeGroup: ProjectionGroup | null;
  playerView: PlayerView;
  scoringSettings: ScoringSettings;
  leagueSettings: LeagueSettings;
  draftState: DraftState;
  mergeTwoWayRankings: boolean;
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
  const footballPlayers = activeGroup.footballPlayers;

  if (footballPlayers?.length > 0) {
    return [...footballPlayers];
  }

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
  if (player._type === "football-player") return true;
  if (view === "batters") return meetsBatterProjectionMinimum(player);
  if (view === "pitchers") return meetsPitcherProjectionMinimum(player);
  return meetsBatterProjectionMinimum(player) || meetsPitcherProjectionMinimum(player);
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
    const positionTokens =
      row.player._type === "football-player"
        ? [row.player.Position]
        : [
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
