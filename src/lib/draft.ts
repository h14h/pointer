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

export type KeeperRoundMoveDirection = "earlier" | "later";

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

export function hasManualDraftActivity(state: DraftState): boolean {
  return Object.keys(state.draftedByTeam).some(
    (playerId) => state.keeperByTeam[playerId] === undefined
  );
}

export function hasDraftActivity(state: DraftState): boolean {
  return hasManualDraftActivity(state) || Object.keys(state.keeperByTeam).length > 0;
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

export function findNextAvailableKeeperRound({
  leagueSize,
  currentRound,
  teamIndex,
  direction,
  occupiedRounds,
  minRound = 1,
  maxRound,
  pickIndex,
  format = "snake",
}: {
  leagueSize: number;
  currentRound: number;
  teamIndex: number;
  direction: KeeperRoundMoveDirection;
  occupiedRounds: Iterable<number>;
  minRound?: number;
  maxRound: number;
  pickIndex: number;
  format?: DraftFormat;
}): number | null {
  const safeCurrentRound = Math.max(1, Math.floor(currentRound));
  const safeMinRound = Math.max(1, Math.floor(minRound));
  const safeMaxRound = Math.max(safeMinRound, Math.floor(maxRound));
  const occupied = new Set(
    Array.from(occupiedRounds)
      .map((round) => Math.floor(round))
      .filter((round) => round >= safeMinRound && round <= safeMaxRound)
  );
  const increment = direction === "earlier" ? -1 : 1;
  let candidateRound = safeCurrentRound + increment;

  while (candidateRound >= safeMinRound && candidateRound <= safeMaxRound) {
    if (!occupied.has(candidateRound)) {
      const candidatePickIndex = getPickIndexForTeamRound(
        leagueSize,
        candidateRound,
        teamIndex,
        format
      );
      if (candidatePickIndex !== null && candidatePickIndex >= pickIndex) {
        return candidateRound;
      }
    }
    candidateRound += increment;
  }

  return null;
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
