import type {
  FootballPlayer,
  FootballPosition,
  FootballRosterSettings,
  FootballRosterSlot,
} from "@/types";

// Football PAR mirrors the baseball implementation: allocate the top players
// to every starting slot league-wide (maximum bipartite matching, best players
// first), then a position's replacement level is the best player left in the
// pool. A player's PAR is their points above the best replacement level among
// the slots they can fill.

const SLOT_POSITIONS: Record<FootballRosterSlot, FootballPosition[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  K: ["K"],
  DST: ["DST"],
  FLEX: ["RB", "WR", "TE"],
  SUPERFLEX: ["QB", "RB", "WR", "TE"],
};

export const FOOTBALL_ROSTER_SLOTS: FootballRosterSlot[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "FLEX",
  "SUPERFLEX",
  "K",
  "DST",
];

export function getEligibleFootballSlots(position: FootballPosition): FootballRosterSlot[] {
  return FOOTBALL_ROSTER_SLOTS.filter((slot) => SLOT_POSITIONS[slot].includes(position));
}

type ScoredFootballPlayer = { player: FootballPlayer; projectedPoints: number };

function getSortedPlayers(players: ScoredFootballPlayer[]): ScoredFootballPlayer[] {
  return [...players].sort((a, b) => b.projectedPoints - a.projectedPoints);
}

function allocatePlayersToSlots(
  players: ScoredFootballPlayer[],
  slotCounts: Partial<Record<FootballRosterSlot, number>>
): Set<string> {
  const slotInstances = Object.entries(slotCounts).flatMap(([slot, count]) =>
    Array.from({ length: count ?? 0 }, () => slot as FootballRosterSlot)
  );

  if (slotInstances.length === 0) return new Set();

  const sortedPlayers = getSortedPlayers(players);
  const eligibleSlotIndexes = sortedPlayers.map((scored) =>
    slotInstances.flatMap((slot, index) =>
      SLOT_POSITIONS[slot].includes(scored.player.Position) ? [index] : []
    )
  );

  const slotMatches = Array<number>(slotInstances.length).fill(-1);

  const tryMatch = (playerIndex: number, visited: boolean[]): boolean => {
    for (const slotIndex of eligibleSlotIndexes[playerIndex]) {
      if (visited[slotIndex]) continue;
      visited[slotIndex] = true;

      const currentPlayerIndex = slotMatches[slotIndex];
      if (currentPlayerIndex === -1 || tryMatch(currentPlayerIndex, visited)) {
        slotMatches[slotIndex] = playerIndex;
        return true;
      }
    }

    return false;
  };

  let matchedCount = 0;
  for (let playerIndex = 0; playerIndex < sortedPlayers.length; playerIndex += 1) {
    const visited = Array<boolean>(slotInstances.length).fill(false);
    if (tryMatch(playerIndex, visited)) {
      matchedCount += 1;
      if (matchedCount === slotInstances.length) break;
    }
  }

  return new Set(
    slotMatches
      .filter((playerIndex): playerIndex is number => playerIndex !== -1)
      .map((playerIndex) => sortedPlayers[playerIndex].player._id)
  );
}

export function calculateFootballReplacementLevels(
  players: ScoredFootballPlayer[],
  roster: FootballRosterSettings,
  leagueSize: number
): Partial<Record<FootballRosterSlot, number>> {
  const activeSlotCounts = Object.fromEntries(
    FOOTBALL_ROSTER_SLOTS.map(
      (slot) => [slot, (roster.positions[slot] ?? 0) * leagueSize] as const
    ).filter(([, count]) => count > 0)
  ) as Partial<Record<FootballRosterSlot, number>>;

  const assignedPlayerIds = allocatePlayersToSlots(players, activeSlotCounts);
  const sortedPlayers = getSortedPlayers(players);

  const replacementLevels: Partial<Record<FootballRosterSlot, number>> = {};
  for (const slot of FOOTBALL_ROSTER_SLOTS) {
    if ((activeSlotCounts[slot] ?? 0) === 0) continue;
    const bestRemaining = sortedPlayers.find(
      (scored) =>
        !assignedPlayerIds.has(scored.player._id) &&
        SLOT_POSITIONS[slot].includes(scored.player.Position)
    );
    replacementLevels[slot] = bestRemaining?.projectedPoints ?? 0;
  }

  return replacementLevels;
}

export function calculateFootballPAR(
  players: ScoredFootballPlayer[],
  roster: FootballRosterSettings,
  leagueSize: number
): Map<string, number> {
  const replacementLevels = calculateFootballReplacementLevels(players, roster, leagueSize);

  const parById = new Map<string, number>();
  for (const scored of players) {
    const slots = getEligibleFootballSlots(scored.player.Position).filter(
      (slot) => replacementLevels[slot] !== undefined
    );

    if (slots.length === 0) {
      parById.set(scored.player._id, 0);
      continue;
    }

    const par = Math.max(
      ...slots.map((slot) => scored.projectedPoints - (replacementLevels[slot] ?? 0))
    );
    parById.set(scored.player._id, Math.round(par * 10) / 10);
  }

  return parById;
}
