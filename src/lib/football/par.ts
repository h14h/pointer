import type {
  FootballPlayer,
  FootballPosition,
  FootballRosterSettings,
  FootballRosterSlot,
} from "@/types";

// Football PAR mirrors the baseball starter-allocation model, then layers on
// football bench demand. Unlike baseball, football PAR is live during a draft:
// drafted/keeper players leave the pool and consume remaining slot demand, so
// a saturated position (typical case: 1-QB after the starter run) no longer
// outranks leftover WR/TE value. A player's PAR is their points above the
// best remaining replacement level among the slots they can fill.

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
type PositionalRosterDemand = Record<FootballPosition, number>;

function getSortedPlayers(players: ScoredFootballPlayer[]): ScoredFootballPlayer[] {
  return [...players].sort((a, b) => b.projectedPoints - a.projectedPoints);
}

function emptyPositionalDemand(): PositionalRosterDemand {
  return { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
}

function roundSharesToTotal(
  shares: Partial<Record<FootballPosition, number>>,
  total: number
): PositionalRosterDemand {
  const demand = emptyPositionalDemand();
  if (total <= 0) return demand;

  const positions = (Object.keys(shares) as FootballPosition[]).filter(
    (position) => (shares[position] ?? 0) > 0
  );
  const shareTotal = positions.reduce((sum, position) => sum + (shares[position] ?? 0), 0);
  if (shareTotal <= 0) return demand;

  const ranked = positions
    .map((position) => {
      const exact = ((shares[position] ?? 0) / shareTotal) * total;
      const count = Math.floor(exact);
      demand[position] = count;
      return { position, remainder: exact - count };
    })
    .sort((a, b) => b.remainder - a.remainder);

  let remaining = total - positions.reduce((sum, position) => sum + demand[position], 0);
  for (let i = 0; remaining > 0; i += 1) {
    demand[ranked[i % ranked.length].position] += 1;
    remaining -= 1;
  }

  return demand;
}

export function calculateFootballPositionalRosterDemand(
  roster: FootballRosterSettings,
  leagueSize: number
): PositionalRosterDemand {
  const starterDemand = calculateFootballPositionalStarterDemand(roster, leagueSize);
  const benchDemand = calculateFootballPositionalBenchDemand(roster, leagueSize);
  return {
    QB: starterDemand.QB + benchDemand.QB,
    RB: starterDemand.RB + benchDemand.RB,
    WR: starterDemand.WR + benchDemand.WR,
    TE: starterDemand.TE + benchDemand.TE,
    K: starterDemand.K + benchDemand.K,
    DST: starterDemand.DST + benchDemand.DST,
  };
}

function calculateFootballPositionalStarterDemand(
  roster: FootballRosterSettings,
  leagueSize: number
): PositionalRosterDemand {
  const demand = emptyPositionalDemand();
  const teams = Math.max(0, Math.floor(leagueSize));
  if (teams === 0) return demand;

  const qbStarters = Math.max(0, roster.positions.QB ?? 0) * teams;
  const rbStarters = Math.max(0, roster.positions.RB ?? 0) * teams;
  const wrStarters = Math.max(0, roster.positions.WR ?? 0) * teams;
  const teStarters = Math.max(0, roster.positions.TE ?? 0) * teams;
  const kStarters = Math.max(0, roster.positions.K ?? 0) * teams;
  const dstStarters = Math.max(0, roster.positions.DST ?? 0) * teams;
  const flexStarters = Math.max(0, roster.positions.FLEX ?? 0) * teams;
  const superflexStarters = Math.max(0, roster.positions.SUPERFLEX ?? 0) * teams;

  demand.QB = qbStarters + Math.round(superflexStarters * 0.75);
  demand.RB = rbStarters + Math.round(flexStarters * 0.48) + Math.round(superflexStarters * 0.1);
  demand.WR = wrStarters + Math.round(flexStarters * 0.42) + Math.round(superflexStarters * 0.1);
  demand.TE = teStarters + Math.max(0, flexStarters - Math.round(flexStarters * 0.9));
  demand.K = kStarters;
  demand.DST = dstStarters;

  return demand;
}

function calculateFootballPositionalBenchDemand(
  roster: FootballRosterSettings,
  leagueSize: number
): PositionalRosterDemand {
  const demand = emptyPositionalDemand();
  const teams = Math.max(0, Math.floor(leagueSize));
  if (teams === 0) return demand;

  const qbStarters = Math.max(0, roster.positions.QB ?? 0) * teams;
  const rbStarters = Math.max(0, roster.positions.RB ?? 0) * teams;
  const wrStarters = Math.max(0, roster.positions.WR ?? 0) * teams;
  const teStarters = Math.max(0, roster.positions.TE ?? 0) * teams;
  const flexStarters = Math.max(0, roster.positions.FLEX ?? 0) * teams;
  const superflexStarters = Math.max(0, roster.positions.SUPERFLEX ?? 0) * teams;
  const benchTotal = Math.max(0, Math.floor(roster.bench ?? 0)) * teams;
  if (benchTotal === 0) return demand;

  const hasSuperflex = (roster.positions.SUPERFLEX ?? 0) > 0;
  const qbBenchCapPerTeam = (roster.positions.QB ?? 0) > 0 || hasSuperflex
    ? hasSuperflex
      ? 1.6
      : 1
    : 0;
  const teBenchCapPerTeam = (roster.positions.TE ?? 0) > 0 || (roster.positions.FLEX ?? 0) > 0
    ? 0.8
    : 0;

  const uncappedBench = roundSharesToTotal(
    {
      QB: qbStarters * (hasSuperflex ? 1.2 : 1.5) + superflexStarters * 0.9,
      RB: rbStarters + flexStarters * 0.55 + superflexStarters * 0.15,
      WR: wrStarters + flexStarters * 0.55 + superflexStarters * 0.15,
      TE: teStarters * 0.65 + flexStarters * 0.12,
    },
    benchTotal
  );

  const qbBench = Math.min(uncappedBench.QB, Math.round(qbBenchCapPerTeam * teams));
  const teBench = Math.min(uncappedBench.TE, Math.round(teBenchCapPerTeam * teams));
  const rbWrBench = benchTotal - qbBench - teBench;
  const rbWrSplit = roundSharesToTotal(
    {
      RB: rbStarters + flexStarters * 0.55 + superflexStarters * 0.15,
      WR: wrStarters + flexStarters * 0.55 + superflexStarters * 0.15,
    },
    rbWrBench
  );

  demand.QB = qbBench;
  demand.RB = rbWrSplit.RB;
  demand.WR = rbWrSplit.WR;
  demand.TE = teBench;
  return demand;
}

export type FootballPAROptions = {
  /** Drafted and keeper player ids. Remaining demand ignores these players. */
  takenPlayerIds?: Iterable<string>;
};

function getTakenPlayerIdSet(options?: FootballPAROptions): Set<string> {
  return new Set(options?.takenPlayerIds ?? []);
}

function getStarterSlotCounts(
  roster: FootballRosterSettings,
  leagueSize: number
): Partial<Record<FootballRosterSlot, number>> {
  return Object.fromEntries(
    FOOTBALL_ROSTER_SLOTS.map(
      (slot) => [slot, (roster.positions[slot] ?? 0) * leagueSize] as const
    ).filter(([, count]) => count > 0)
  ) as Partial<Record<FootballRosterSlot, number>>;
}

function getAllocationSlotCounts(
  roster: FootballRosterSettings,
  leagueSize: number
): Partial<Record<FootballRosterSlot, number>> {
  const starterSlotCounts = getStarterSlotCounts(roster, leagueSize);
  const benchDemand = calculateFootballPositionalBenchDemand(roster, leagueSize);

  return FOOTBALL_ROSTER_SLOTS.reduce<Partial<Record<FootballRosterSlot, number>>>((counts, slot) => {
    const starterCount = starterSlotCounts[slot] ?? 0;
    const benchCount = SLOT_POSITIONS[slot].length === 1 ? benchDemand[SLOT_POSITIONS[slot][0]] : 0;
    const total = starterCount + benchCount;
    if (total > 0) counts[slot] = total;
    return counts;
  }, {});
}

function consumeTakenPlayerSlots(
  slotCounts: Partial<Record<FootballRosterSlot, number>>,
  takenPlayers: ScoredFootballPlayer[]
): Partial<Record<FootballRosterSlot, number>> {
  const remaining: Partial<Record<FootballRosterSlot, number>> = { ...slotCounts };
  const take = (slot: FootballRosterSlot, count: number): number => {
    if (count <= 0) return 0;
    const available = remaining[slot] ?? 0;
    const consumed = Math.min(available, count);
    if (consumed > 0) {
      const next = available - consumed;
      if (next > 0) remaining[slot] = next;
      else delete remaining[slot];
    }
    return count - consumed;
  };

  const takenByPosition = emptyPositionalDemand();
  for (const scored of takenPlayers) {
    takenByPosition[scored.player.Position] += 1;
  }

  const leftoverQB = take("QB", takenByPosition.QB);
  const leftoverRB = take("RB", takenByPosition.RB);
  const leftoverWR = take("WR", takenByPosition.WR);
  const leftoverTE = take("TE", takenByPosition.TE);
  take("K", takenByPosition.K);
  take("DST", takenByPosition.DST);

  const leftoverSkill = take("FLEX", leftoverRB + leftoverWR + leftoverTE);
  take("SUPERFLEX", leftoverQB + leftoverSkill);

  return remaining;
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
  leagueSize: number,
  options?: FootballPAROptions
): Partial<Record<FootballRosterSlot, number>> {
  const takenIds = getTakenPlayerIdSet(options);
  const takenPlayers = takenIds.size === 0
    ? []
    : players.filter((scored) => takenIds.has(scored.player._id));
  const availablePlayers = takenIds.size === 0
    ? players
    : players.filter((scored) => !takenIds.has(scored.player._id));

  const starterSlotCounts = getStarterSlotCounts(roster, leagueSize);
  const allocationSlotCounts = getAllocationSlotCounts(roster, leagueSize);
  const remainingSlotCounts = takenPlayers.length === 0
    ? allocationSlotCounts
    : consumeTakenPlayerSlots(allocationSlotCounts, takenPlayers);

  const assignedPlayerIds = allocatePlayersToSlots(availablePlayers, remainingSlotCounts);
  const sortedPlayers = getSortedPlayers(availablePlayers);

  const replacementLevels: Partial<Record<FootballRosterSlot, number>> = {};
  for (const slot of FOOTBALL_ROSTER_SLOTS) {
    if ((starterSlotCounts[slot] ?? 0) === 0) continue;
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
  leagueSize: number,
  options?: FootballPAROptions
): Map<string, number> {
  const replacementLevels = calculateFootballReplacementLevels(
    players,
    roster,
    leagueSize,
    options
  );

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
