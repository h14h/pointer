import type { DraftFormat, DraftPick, DraftState } from "@/types";

export type DraftPickContext = {
  overallPick: number;
  round: number;
  pickInRound: number;
  teamIndex: number;
  nextTeamIndex: number;
};

export type ReservedKeeperPick = {
  playerId: string;
  teamIndex: number;
  slotIndex: number;
};

export function getDraftPickContext(
  leagueSize: number,
  pickIndex: number,
  format: DraftFormat = "snake"
): DraftPickContext {
  const safeLeagueSize = Math.max(1, Math.floor(leagueSize));
  const safePickIndex = Math.max(0, Math.floor(pickIndex));
  const round = Math.floor(safePickIndex / safeLeagueSize) + 1;
  const pickInRound = (safePickIndex % safeLeagueSize) + 1;
  const isReversedRound = format === "snake" && round % 2 === 0;
  const teamIndex = isReversedRound
    ? safeLeagueSize - pickInRound
    : pickInRound - 1;
  const nextContext = getDraftPickContextInternal(safeLeagueSize, safePickIndex + 1, format);

  return {
    overallPick: safePickIndex + 1,
    round,
    pickInRound,
    teamIndex,
    nextTeamIndex: nextContext.teamIndex,
  };
}

function getDraftPickContextInternal(
  leagueSize: number,
  pickIndex: number,
  format: DraftFormat
): Omit<DraftPickContext, "nextTeamIndex"> {
  const round = Math.floor(pickIndex / leagueSize) + 1;
  const pickInRound = (pickIndex % leagueSize) + 1;
  const isReversedRound = format === "snake" && round % 2 === 0;
  const teamIndex = isReversedRound ? leagueSize - pickInRound : pickInRound - 1;

  return {
    overallPick: pickIndex + 1,
    round,
    pickInRound,
    teamIndex,
  };
}

export function countManualDraftPicks(state: DraftState): number {
  return state.history.length;
}

export function hasDraftActivity(state: DraftState): boolean {
  return Object.keys(state.draftedByTeam).length > 0 || Object.keys(state.keeperByTeam).length > 0;
}

export function getPickIndexForTeamRound(
  leagueSize: number,
  round: number,
  teamIndex: number,
  format: DraftFormat = "snake"
): number | null {
  const safeLeagueSize = Math.max(1, Math.floor(leagueSize));
  const safeRound = Math.max(1, Math.floor(round));
  const safeTeamIndex = Math.floor(teamIndex);
  if (safeTeamIndex < 0 || safeTeamIndex >= safeLeagueSize) return null;
  const isReversedRound = format === "snake" && safeRound % 2 === 0;
  const pickInRound = isReversedRound
    ? safeLeagueSize - safeTeamIndex
    : safeTeamIndex + 1;
  return (safeRound - 1) * safeLeagueSize + (pickInRound - 1);
}

export function getReservedKeeperPicks(state: DraftState): ReservedKeeperPick[] {
  return Object.entries(state.keeperByTeam)
    .map(([playerId, teamIndex]) => {
      const slotIndex = state.keeperSlotByPlayer[playerId] ?? null;
      if (slotIndex === null || slotIndex === undefined) return null;
      return {
        playerId,
        teamIndex: Number(teamIndex),
        slotIndex,
      };
    })
    .filter((entry): entry is ReservedKeeperPick => entry !== null);
}

export function getReservedKeeperPickMap(state: DraftState): Map<number, ReservedKeeperPick> {
  return new Map(getReservedKeeperPicks(state).map((entry) => [entry.slotIndex, entry]));
}

export function getNextOpenPickIndex(
  leagueSize: number,
  pickIndex: number,
  format: DraftFormat,
  state: DraftState
): number {
  const reservedPickMap = getReservedKeeperPickMap(state);
  const safeLeagueSize = Math.max(1, Math.floor(leagueSize));
  let nextPickIndex = Math.max(0, Math.floor(pickIndex));
  let guard = 0;

  while (reservedPickMap.has(nextPickIndex) && guard < safeLeagueSize * 200) {
    nextPickIndex += 1;
    guard += 1;
  }

  return nextPickIndex;
}

export function createDraftPick(
  playerId: string,
  teamIndex: number,
  slotIndex: number,
  context: Omit<DraftPickContext, "nextTeamIndex">
): DraftPick {
  return {
    playerId,
    teamIndex,
    slotIndex,
    overallPick: context.overallPick,
    round: context.round,
    pickInRound: context.pickInRound,
    timestamp: Date.now(),
  };
}
