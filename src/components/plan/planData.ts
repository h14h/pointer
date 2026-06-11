// Pure data shaping for the Plan worksheet: a sport-agnostic player shape,
// rank math, and the per-round slot model the pick timeline renders.

import {
  getDraftPickContext,
  getNextOpenPickIndex,
  getPickIndexForTeamRound,
  getReservedKeeperPickMap,
} from "@/lib/draft";
import { formatEligibilityForLeaderboard } from "@/lib/eligibility";
import type { FootballRankedPlayer } from "@/lib/football";
import type { League, RankedPlayer } from "@/types";

/** One player in the worksheet pool, normalized across sports. */
export type PlanPlayer = {
  id: string;
  name: string;
  team: string;
  pos: string;
  /** Bucket for the tier-supply panel (positions or Batters/Pitchers). */
  supplyGroup: string;
  points: number;
  /** 1-based overall rank by projected points, descending. */
  rank: number;
  isDrafted: boolean;
  isKeeper: boolean;
  available: boolean;
};

export type RoundSlotStatus = "logged" | "keeper" | "ondeck" | "projected";

export type RoundSlot = {
  round: number;
  pickInRound: number;
  overall: number;
  status: RoundSlotStatus;
  /** Resolved player for logged/keeper slots. */
  player: PlanPlayer | null;
  /** Raw id fallback when the player is not in the current pool. */
  playerId: string | null;
  /** Projected slots: available players likely still on the board. */
  likely: PlanPlayer[];
  /** On-deck slot: the current top of the available board. */
  topOfBoard: PlanPlayer[];
};

function baseballPositionLabel(row: RankedPlayer): string {
  const formatted = formatEligibilityForLeaderboard(row.player);
  if (formatted !== "-") return formatted;
  if (row.player._type === "pitcher") return "P";
  if (row.player._type === "two-way") return "UTIL/P";
  return "UTIL";
}

export function fromBaseballRanked(rows: RankedPlayer[]): PlanPlayer[] {
  return [...rows]
    .sort((a, b) => b.projectedPoints - a.projectedPoints)
    .map((row, index) => ({
      id: row.player._id,
      name: row.player.Name,
      team: row.player.Team,
      pos: baseballPositionLabel(row),
      supplyGroup: row.player._type === "pitcher" ? "Pitchers" : "Batters",
      points: row.projectedPoints,
      rank: index + 1,
      isDrafted: row.isDrafted,
      isKeeper: row.isKeeper,
      available: !row.isDrafted && !row.isKeeper,
    }));
}

export function fromFootballRanked(rows: FootballRankedPlayer[]): PlanPlayer[] {
  return [...rows]
    .sort((a, b) => b.projectedPoints - a.projectedPoints)
    .map((row, index) => ({
      id: row.player._id,
      name: row.player.Name,
      team: row.player.Team,
      pos: row.player.Position,
      supplyGroup: row.player.Position,
      points: row.projectedPoints,
      rank: index + 1,
      isDrafted: row.isDrafted,
      isKeeper: row.isKeeper,
      available: !row.isDrafted && !row.isKeeper,
    }));
}

/** My overall pick numbers (1-based) across every round of the draft. */
export function getMyPickOveralls(league: League, totalRounds: number): number[] {
  const { leagueSize } = league.leagueSettings;
  const format = league.draftState.format ?? "snake";
  const myTeamIndex = league.myTeamIndex ?? 0;
  const overalls: number[] = [];
  for (let round = 1; round <= totalRounds; round++) {
    const pickIndex = getPickIndexForTeamRound(leagueSize, round, myTeamIndex, format);
    if (pickIndex !== null) overalls.push(pickIndex + 1);
  }
  return overalls;
}

/**
 * "take by p{overall}" — the latest of my picks where a player at this rank
 * is plausibly still on the board (rank + 3 picks of slack), else "early".
 */
export function formatTakeBy(rank: number, myPickOveralls: number[]): string {
  const feasible = myPickOveralls.filter((overall) => overall <= rank + 3);
  const last = feasible[feasible.length - 1];
  return last !== undefined ? `take by p${last}` : "early";
}

/**
 * Builds the per-round slot model for the pick timeline: one entry per round
 * of my team, with logged/keeper/on-deck/projected status resolved against
 * the draft state and the ranked pool.
 */
export function buildRoundSlots(
  league: League,
  players: PlanPlayer[],
  totalRounds: number
): RoundSlot[] {
  const { leagueSize } = league.leagueSettings;
  const draftState = league.draftState;
  const format = draftState.format ?? "snake";
  const myTeamIndex = league.myTeamIndex ?? 0;

  const playerById = new Map(players.map((player) => [player.id, player]));
  const available = players.filter((player) => player.available);
  const topOfBoard = available.slice(0, 2);
  const reservedKeeperByPickIndex = getReservedKeeperPickMap(draftState);
  const nextOpenPickIndex = getNextOpenPickIndex(
    leagueSize,
    draftState.pickIndex,
    format,
    draftState
  );
  const myHistoryByRound = new Map(
    draftState.history
      .filter((pick) => pick.teamIndex === myTeamIndex)
      .map((pick) => [pick.round, pick])
  );

  const slots: RoundSlot[] = [];
  for (let round = 1; round <= totalRounds; round++) {
    const pickIndex = getPickIndexForTeamRound(leagueSize, round, myTeamIndex, format);
    if (pickIndex === null) continue;
    const context = getDraftPickContext(leagueSize, pickIndex, format);

    const logged = myHistoryByRound.get(round);
    const keeper = reservedKeeperByPickIndex.get(pickIndex);
    const isOnDeck = pickIndex === nextOpenPickIndex;

    let status: RoundSlotStatus = "projected";
    let playerId: string | null = null;
    if (logged) {
      status = "logged";
      playerId = logged.playerId;
    } else if (keeper) {
      status = "keeper";
      playerId = keeper.playerId;
    } else if (isOnDeck) {
      status = "ondeck";
    }

    const likely =
      status === "projected"
        ? pickLikelyOnBoard(available, context.overallPick)
        : [];

    slots.push({
      round,
      pickInRound: context.pickInRound,
      overall: context.overallPick,
      status,
      player: playerId ? (playerById.get(playerId) ?? null) : null,
      playerId,
      likely,
      topOfBoard: status === "ondeck" ? topOfBoard : [],
    });
  }
  return slots;
}

/** The 2 available players whose rank is closest to but ≥ the overall pick. */
function pickLikelyOnBoard(available: PlanPlayer[], overall: number): PlanPlayer[] {
  const candidates: PlanPlayer[] = [];
  for (const player of available) {
    if (player.rank >= overall) {
      candidates.push(player);
      if (candidates.length === 2) return candidates;
    }
  }
  // Deep rounds past the printed pool: show the tail of the board instead.
  return candidates.length > 0 ? candidates : available.slice(-2);
}

/** Total rounds = roster slots + bench, per the league's sport. */
export function getTotalRounds(
  league: League,
  footballRoster: { positions: Record<string, number>; bench: number } | null
): number {
  if (league.sport === "football" && footballRoster) {
    return (
      Object.values(footballRoster.positions).reduce((total, value) => total + value, 0) +
      footballRoster.bench
    );
  }
  const roster = league.leagueSettings.roster;
  return (
    Object.values(roster.positions).reduce((total, value) => total + value, 0) +
    roster.bench
  );
}
