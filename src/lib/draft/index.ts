import type { DraftFormat, DraftPick, DraftState } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export type LegacyDraftState = {
  draftedByTeam?: Record<string, string>;
  keeperByTeam?: Record<string, string>;
  keeperSlotByPlayer?: Record<string, number | null>;
  activeTeamIndex?: number;
  format?: DraftFormat;
  pickIndex?: number;
  history?: DraftPick[];
};

// ---------------------------------------------------------------------------
// Existing pure helpers (moved from src/lib/draft.ts)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// New pure state transformers (extracted from store actions)
// ---------------------------------------------------------------------------

/**
 * Returns the base cursor position for the draft, used to find the next open
 * pick. If there is history, uses the slot after the last pick. Otherwise
 * returns 0 unless there are manual (non-keeper) drafted players.
 */
export function getDraftCursorBase(state: DraftState): number {
  const lastPick = state.history.at(-1);
  if (lastPick) return lastPick.slotIndex + 1;
  const hasKnownManualProgress = Object.keys(state.draftedByTeam).some(
    (playerId) => state.keeperByTeam[playerId] === undefined
  );
  return hasKnownManualProgress ? state.pickIndex : 0;
}

/**
 * Normalizes a potentially-legacy or missing draft state into a well-formed
 * DraftState.
 */
export function migrateDraftState(input?: LegacyDraftState | null): DraftState {
  const draftedByTeam = { ...(input?.draftedByTeam ?? {}) };
  const keeperByTeam = { ...(input?.keeperByTeam ?? {}) };
  const keeperSlotByPlayer = { ...(input?.keeperSlotByPlayer ?? {}) };
  const history = Array.isArray(input?.history) ? input.history : [];
  const fallbackPickIndex = Object.keys(draftedByTeam).filter(
    (playerId) => keeperByTeam[playerId] === undefined
  ).length;
  const historyCursor = history.at(-1)?.slotIndex;
  const persistedPickIndex = Number.isFinite(input?.pickIndex)
    ? Math.max(0, Math.round(input?.pickIndex as number))
    : null;
  const pickIndex = historyCursor !== undefined
    ? Math.max((historyCursor ?? -1) + 1, persistedPickIndex ?? 0)
    : (persistedPickIndex ?? fallbackPickIndex);

  return {
    format: input?.format ?? "snake",
    draftedByTeam,
    keeperByTeam,
    keeperSlotByPlayer,
    pickIndex,
    history,
  };
}

/**
 * Returns whether the draft setup (keepers, format, etc.) can still be edited.
 * Returns false when manual (non-keeper) draft activity has occurred.
 */
export function canEditDraftSetup(draftState: DraftState): boolean {
  return !hasManualDraftActivity(draftState);
}

/**
 * Pure state transformer: drafts a player, advances the cursor to the next
 * open pick. Returns the original state unchanged if the player is already
 * drafted or is a keeper.
 */
export function advancePick(
  draftState: DraftState,
  playerId: string,
  leagueSize: number,
  format: DraftFormat = "snake"
): DraftState {
  if (draftState.draftedByTeam[playerId] !== undefined) return draftState;
  if (draftState.keeperByTeam[playerId] !== undefined) return draftState;

  const openPickIndex = getNextOpenPickIndex(
    leagueSize,
    draftState.pickIndex,
    format,
    draftState
  );
  const context = getDraftPickContext(leagueSize, openPickIndex, format);
  const teamKey = String(context.teamIndex);

  const draftedByTeam = { ...draftState.draftedByTeam, [playerId]: teamKey };
  const nextPick = createDraftPick(playerId, context.teamIndex, openPickIndex, context);
  const history = [...draftState.history, nextPick];

  const nextPickIndex = getNextOpenPickIndex(
    leagueSize,
    openPickIndex + 1,
    format,
    draftState
  );

  return {
    ...draftState,
    draftedByTeam,
    pickIndex: nextPickIndex,
    history,
  };
}

/**
 * Pure state transformer: removes the last pick from history and restores the
 * cursor. Returns the original state unchanged if history is empty.
 */
export function undoLastPick(draftState: DraftState): DraftState {
  const lastPick = draftState.history.at(-1);
  if (!lastPick) return draftState;

  const draftedByTeam = { ...draftState.draftedByTeam };
  delete draftedByTeam[lastPick.playerId];

  return {
    ...draftState,
    draftedByTeam,
    pickIndex: lastPick.slotIndex,
    history: draftState.history.slice(0, -1),
  };
}

/**
 * Pure state transformer: assigns a player as a keeper on a team at a given
 * round. Returns the original state if the slot is occupied by another keeper
 * or the round is in the past.
 */
export function setKeeper(
  draftState: DraftState,
  playerId: string,
  teamIndex: number,
  round: number | null,
  leagueSize: number,
  format: DraftFormat = "snake"
): DraftState {
  const maxIndex = leagueSize - 1;
  const normalizedTeamIndex = Math.min(Math.max(0, teamIndex), maxIndex);

  const reservedPickIndex =
    round === null
      ? null
      : getPickIndexForTeamRound(leagueSize, round, normalizedTeamIndex, format);

  if (round !== null && reservedPickIndex === null) return draftState;
  if (reservedPickIndex !== null && reservedPickIndex < draftState.pickIndex) {
    return draftState;
  }

  const existingReservationOwner = Object.entries(draftState.keeperSlotByPlayer).find(
    ([otherPlayerId, slotIndex]) =>
      otherPlayerId !== playerId &&
      slotIndex !== null &&
      slotIndex === reservedPickIndex
  );
  if (reservedPickIndex !== null && existingReservationOwner) return draftState;

  const keeperByTeam = { ...draftState.keeperByTeam, [playerId]: String(normalizedTeamIndex) };
  const draftedByTeam = { ...draftState.draftedByTeam };
  const keeperSlotByPlayer = {
    ...draftState.keeperSlotByPlayer,
    [playerId]: reservedPickIndex,
  };
  delete draftedByTeam[playerId];

  const nextDraftState: DraftState = {
    ...draftState,
    draftedByTeam,
    keeperByTeam,
    keeperSlotByPlayer,
  };

  return {
    ...nextDraftState,
    pickIndex: getNextOpenPickIndex(
      leagueSize,
      getDraftCursorBase(nextDraftState),
      nextDraftState.format,
      nextDraftState
    ),
  };
}

/**
 * Pure state transformer: removes a keeper assignment. Returns the original
 * state if the player is not a keeper.
 */
export function removeKeeper(
  draftState: DraftState,
  playerId: string,
  leagueSize: number,
  format: DraftFormat = "snake"
): DraftState {
  if (draftState.keeperByTeam[playerId] === undefined) return draftState;

  const keeperByTeam = { ...draftState.keeperByTeam };
  const keeperSlotByPlayer = { ...draftState.keeperSlotByPlayer };
  delete keeperByTeam[playerId];
  delete keeperSlotByPlayer[playerId];

  const nextDraftState: DraftState = {
    ...draftState,
    keeperByTeam,
    keeperSlotByPlayer,
  };

  return {
    ...nextDraftState,
    pickIndex: getNextOpenPickIndex(
      leagueSize,
      getDraftCursorBase(nextDraftState),
      nextDraftState.format,
      nextDraftState
    ),
  };
}

/**
 * Pure state transformer: clears all manual draft picks and history but
 * preserves keepers.
 */
export function resetDraft(
  draftState: DraftState,
  leagueSize: number,
  format: DraftFormat = "snake"
): DraftState {
  const nextDraftState: DraftState = {
    ...draftState,
    draftedByTeam: {},
    history: [],
    pickIndex: 0,
  };

  return {
    ...nextDraftState,
    pickIndex: getNextOpenPickIndex(
      leagueSize,
      getDraftCursorBase(nextDraftState),
      nextDraftState.format,
      nextDraftState
    ),
  };
}

/**
 * Returns the current pick context for the draft, or null if the draft state
 * has no valid cursor position. Wraps getDraftPickContext with the state's
 * current pickIndex.
 */
export function getPickContext(
  draftState: DraftState,
  leagueSize: number,
  format: DraftFormat = "snake"
): DraftPickContext | null {
  if (leagueSize < 1) return null;
  return getDraftPickContext(leagueSize, draftState.pickIndex, format);
}
