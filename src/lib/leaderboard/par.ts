import type { Player, RankedPlayer, LeagueSettings, RosterSlot, Position } from "@/types";

type SlotType = RosterSlot;

// First-pass start-limit model assumptions. These should become league-level
// settings if we want owners to tune PAR for their scoring environment.
const STARTS_PER_WEEK_PER_SP = 1.2;
const FANTASY_SEASON_WEEKS = 25;
const STARTS_PER_SEASON_PER_SP = STARTS_PER_WEEK_PER_SP * FANTASY_SEASON_WEEKS;
const REPLACEMENT_DEMAND_EPSILON = 1e-9;

type PitchingUsage = { G: number; GS: number };
type StartScarcityAdjustment = {
  weight: number;
  replacementPointsPerStart: number;
};
type StartLimitReplacementContext = {
  reliefReplacementLevel: number | null;
};

const SLOT_POSITION_MAP: Record<SlotType, Position[]> = {
  C: ["C"],
  "1B": ["1B"],
  "2B": ["2B"],
  "3B": ["3B"],
  SS: ["SS"],
  LF: ["LF"],
  CF: ["CF"],
  RF: ["RF"],
  DH: ["DH"],
  OF: ["LF", "CF", "RF"],
  IF: ["1B", "2B", "3B", "SS"],
  CI: ["1B", "3B"],
  MI: ["2B", "SS"],
  UTIL: ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"],
  SP: [],
  RP: [],
  P: [],
  IL: [],
  NA: [],
};

function isBatterSlot(slot: SlotType): boolean {
  return slot in SLOT_POSITION_MAP && SLOT_POSITION_MAP[slot].length > 0;
}

function isPitcherSlot(slot: SlotType): boolean {
  return slot === "SP" || slot === "RP" || slot === "P";
}

function getTotalRosterSlots(settings: LeagueSettings, slot: SlotType): number {
  return (settings.roster.positions[slot] ?? 0) * settings.leagueSize;
}

export function getEligibleSlotTypes(player: Player): SlotType[] {
  const slots: SlotType[] = [];

  if (player._type === "batter" || player._type === "two-way") {
    const eligibility = player.eligibility;
    if (!eligibility) return [];

    const ep = eligibility.eligiblePositions;

    if (ep.includes("C")) slots.push("C");
    if (ep.includes("1B")) slots.push("1B");
    if (ep.includes("2B")) slots.push("2B");
    if (ep.includes("3B")) slots.push("3B");
    if (ep.includes("SS")) slots.push("SS");
    if (ep.includes("LF")) slots.push("LF");
    if (ep.includes("CF")) slots.push("CF");
    if (ep.includes("RF")) slots.push("RF");
    if (ep.includes("DH")) slots.push("DH");

    const hasOF = ep.includes("LF") || ep.includes("CF") || ep.includes("RF");
    const hasIF = ep.some(p => ["1B", "2B", "3B", "SS"].includes(p));
    const hasCI = ep.includes("1B") || ep.includes("3B");
    const hasMI = ep.includes("2B") || ep.includes("SS");

    if (hasOF) slots.push("OF");
    if (hasIF) slots.push("IF");
    if (hasCI) slots.push("CI");
    if (hasMI) slots.push("MI");
    if (slots.length > 0) slots.push("UTIL");
  }

  if (player._type === "pitcher" || player._type === "two-way") {
    const eligibility = player.eligibility;
    if (!eligibility) return slots;

    if (eligibility.isSP) slots.push("SP");
    if (eligibility.isRP) slots.push("RP");
    if (eligibility.isSP || eligibility.isRP) slots.push("P");
  }

  return slots;
}

function playerMeetsSlotRequirement(player: Player, slot: SlotType): boolean {
  if (slot === "SP") {
    return player.eligibility?.isSP === true;
  }
  if (slot === "RP") {
    return player.eligibility?.isRP === true;
  }
  if (slot === "P") {
    return player.eligibility?.isSP === true || player.eligibility?.isRP === true;
  }
  const eligibleSlots = getEligibleSlotTypes(player);
  return eligibleSlots.includes(slot);
}

type RankedPlayerForPAR = { player: Player; projectedPoints: number };

type SlotCountMap = Partial<Record<SlotType, number>>;

function getSortedPlayers(rankedPlayers: RankedPlayerForPAR[]): RankedPlayerForPAR[] {
  return [...rankedPlayers].sort((a, b) => b.projectedPoints - a.projectedPoints);
}

function allocatePlayersToSlots(
  rankedPlayers: RankedPlayerForPAR[],
  slotCounts: SlotCountMap
): Set<string> {
  const slotInstances = Object.entries(slotCounts).flatMap(([slot, count]) =>
    Array.from({ length: count ?? 0 }, () => slot as SlotType)
  );

  if (slotInstances.length === 0) return new Set();

  const sortedPlayers = getSortedPlayers(rankedPlayers);
  const eligibleSlotIndexes = sortedPlayers.map(rankedPlayer =>
    slotInstances.flatMap((slot, index) => (
      playerMeetsSlotRequirement(rankedPlayer.player, slot) ? [index] : []
    ))
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
      .map(playerIndex => sortedPlayers[playerIndex].player._id)
  );
}

function getReplacementLevelFromRemainingPool(
  rankedPlayers: RankedPlayerForPAR[],
  slot: SlotType,
  settings: LeagueSettings,
  assignedPlayerIds: Set<string>
): number {
  const totalSlots = getTotalRosterSlots(settings, slot);
  if (totalSlots === 0) return 0;

  const remainingEligiblePlayers = getSortedPlayers(rankedPlayers).filter(rp =>
    !assignedPlayerIds.has(rp.player._id) && playerMeetsSlotRequirement(rp.player, slot)
  );

  if (remainingEligiblePlayers.length === 0) return 0;

  return remainingEligiblePlayers[0].projectedPoints;
}

function getProjectedPitchingGames(player: Player): PitchingUsage | null {
  if (player._type === "pitcher") {
    return { G: player.G, GS: player.GS };
  }
  if (player._type === "two-way") {
    return { G: player._pitchingStats.G, GS: player._pitchingStats.GS };
  }
  return null;
}

function getStarterShare(player: Player): number {
  const usage = getProjectedPitchingGames(player);
  if (!usage) return 0;

  const games = Math.max(0, usage.G);
  const gamesStarted = Math.max(0, usage.GS);

  if (games <= 0) return gamesStarted > 0 ? 1 : 0;

  return Math.min(Math.max(gamesStarted / games, 0), 1);
}

function getRelieverShare(player: Player): number {
  return 1 - getStarterShare(player);
}

function getProjectedSeasonStarts(player: Player): number {
  return Math.max(0, getProjectedPitchingGames(player)?.GS ?? 0);
}

function getStarterCapacitySlotsPerTeam(settings: LeagueSettings): number {
  return (
    (settings.roster.positions.SP ?? 0) +
    (settings.roster.positions.P ?? 0) +
    Math.max(0, settings.roster.bench ?? 0)
  );
}

function getFlexibleStarterCapacitySlotsPerTeam(settings: LeagueSettings): number {
  return (settings.roster.positions.P ?? 0) + Math.max(0, settings.roster.bench ?? 0);
}

function getExcessFlexibleStarterCapacitySlotsPerTeam(settings: LeagueSettings): number {
  const weeklyStartLimit = settings.weeklyStartLimit ?? null;
  if (weeklyStartLimit === null || weeklyStartLimit <= 0) return 0;

  const starterCapacitySlots = getStarterCapacitySlotsPerTeam(settings);
  if (starterCapacitySlots <= 0) return 0;

  const starterSlotsNeededForCap = weeklyStartLimit / STARTS_PER_WEEK_PER_SP;
  const excessStarterSlots = Math.max(0, starterCapacitySlots - starterSlotsNeededForCap);

  return Math.min(excessStarterSlots, getFlexibleStarterCapacitySlotsPerTeam(settings));
}

function getReliefDemandSlotsPerTeam(settings: LeagueSettings): number {
  const weeklyStartLimit = settings.weeklyStartLimit ?? null;
  if (weeklyStartLimit === null || weeklyStartLimit <= 0) return 0;

  return (
    (settings.roster.positions.RP ?? 0) +
    getExcessFlexibleStarterCapacitySlotsPerTeam(settings)
  );
}

function getPoissonProbabilityAtLeast(threshold: number, lambda: number): number {
  if (threshold <= 0) return 1;
  if (lambda <= 0) return 0;

  let probability = Math.exp(-lambda);
  let cumulative = probability;

  for (let count = 1; count < threshold; count += 1) {
    probability *= lambda / count;
    cumulative += probability;
  }

  return Math.min(Math.max(1 - cumulative, 0), 1);
}

function getStartScarcityWeight(settings: LeagueSettings): number {
  const weeklyStartLimit = settings.weeklyStartLimit ?? null;
  if (weeklyStartLimit === null || weeklyStartLimit <= 0) return 0;

  const starterCapacitySlots = getStarterCapacitySlotsPerTeam(settings);
  if (starterCapacitySlots <= 0) return 0;

  const expectedStartsPerTeamPerWeek = starterCapacitySlots * STARTS_PER_WEEK_PER_SP;
  if (expectedStartsPerTeamPerWeek > weeklyStartLimit) {
    return (expectedStartsPerTeamPerWeek - weeklyStartLimit) / expectedStartsPerTeamPerWeek;
  }

  return getPoissonProbabilityAtLeast(
    Math.ceil(weeklyStartLimit),
    expectedStartsPerTeamPerWeek
  );
}

function getReplacementPointsPerStart(
  rankedPlayers: RankedPlayerForPAR[],
  settings: LeagueSettings
): number {
  const starterCapacitySlots = getStarterCapacitySlotsPerTeam(settings);
  if (starterCapacitySlots <= 0) return 0;

  const starterReplacementIndex = Math.floor(starterCapacitySlots * settings.leagueSize);
  const starterLikePitchers = rankedPlayers
    .filter(({ player }) =>
      getProjectedSeasonStarts(player) > 0 &&
      getStarterShare(player) >= 0.5 &&
      playerMeetsSlotRequirement(player, "P")
    )
    .map((rankedPlayer) => ({
      rankedPlayer,
      pointsPerStart: rankedPlayer.projectedPoints / STARTS_PER_SEASON_PER_SP,
    }))
    .sort((left, right) => right.pointsPerStart - left.pointsPerStart);

  if (starterLikePitchers.length === 0) return 0;

  const replacementPitcher =
    starterLikePitchers[
      Math.min(starterReplacementIndex, starterLikePitchers.length - 1)
    ];

  return Math.max(0, replacementPitcher.pointsPerStart);
}

function getWeightedUsageReplacementLevel(
  rankedPlayers: RankedPlayerForPAR[],
  targetDemand: number,
  getUsageShare: (player: Player) => number
): number | null {
  if (targetDemand <= 0) return null;

  const eligiblePlayers = getSortedPlayers(rankedPlayers).filter(({ player }) =>
    getProjectedPitchingGames(player) !== null && playerMeetsSlotRequirement(player, "P")
  );

  let cumulativeUsageShare = 0;
  for (const rankedPlayer of eligiblePlayers) {
    const usageShare = Math.max(0, getUsageShare(rankedPlayer.player));
    if (usageShare <= 0) continue;

    cumulativeUsageShare += usageShare;
    if (cumulativeUsageShare - targetDemand > REPLACEMENT_DEMAND_EPSILON) {
      return rankedPlayer.projectedPoints;
    }
  }

  return null;
}

function getStartLimitReplacementContext(
  rankedPlayers: RankedPlayerForPAR[],
  settings: LeagueSettings
): StartLimitReplacementContext {
  const reliefDemandSlots = getReliefDemandSlotsPerTeam(settings);

  return {
    reliefReplacementLevel: getWeightedUsageReplacementLevel(
      rankedPlayers,
      reliefDemandSlots * settings.leagueSize,
      getRelieverShare
    ),
  };
}

function getStartScarcityAdjustment(
  rankedPlayers: RankedPlayerForPAR[],
  settings: LeagueSettings
): StartScarcityAdjustment {
  const weight = getStartScarcityWeight(settings);
  if (weight <= 0) {
    return { weight: 0, replacementPointsPerStart: 0 };
  }

  return {
    weight,
    replacementPointsPerStart: getReplacementPointsPerStart(rankedPlayers, settings),
  };
}

function applyStartScarcityAdjustment(
  rankedPlayer: RankedPlayerForPAR,
  adjustment: StartScarcityAdjustment
): RankedPlayerForPAR {
  const projectedStarts = getProjectedSeasonStarts(rankedPlayer.player);
  if (projectedStarts <= 0 || adjustment.replacementPointsPerStart <= 0 || adjustment.weight <= 0) {
    return rankedPlayer;
  }

  return {
    ...rankedPlayer,
    projectedPoints:
      rankedPlayer.projectedPoints -
      projectedStarts * adjustment.replacementPointsPerStart * adjustment.weight,
  };
}

function applyStartScarcityAdjustments(
  rankedPlayers: RankedPlayerForPAR[],
  settings: LeagueSettings
): RankedPlayerForPAR[] {
  const adjustment = getStartScarcityAdjustment(rankedPlayers, settings);

  return rankedPlayers.map((rankedPlayer) =>
    applyStartScarcityAdjustment(rankedPlayer, adjustment)
  );
}

function computePlayerPARForSlot(
  projectedPoints: number,
  slot: SlotType,
  replacementLevels: Record<SlotType, number>
): number {
  const replacement = replacementLevels[slot] ?? 0;
  return Math.round((projectedPoints - replacement) * 10) / 10;
}

function computeBatterPAR(
  player: Player,
  projectedPoints: number,
  replacementLevels: Record<SlotType, number>
): number {
  const eligibleSlots = getEligibleSlotTypes(player).filter(isBatterSlot);
  if (eligibleSlots.length === 0) return 0;

  let maxPar = Number.NEGATIVE_INFINITY;
  for (const slot of eligibleSlots) {
    if (!(slot in replacementLevels)) continue;
    const par = computePlayerPARForSlot(projectedPoints, slot, replacementLevels);
    if (par > maxPar) maxPar = par;
  }
  return maxPar === Number.NEGATIVE_INFINITY ? 0 : maxPar;
}

function computePitcherPAR(
  player: Player,
  projectedPoints: number,
  replacementLevels: Record<SlotType, number>,
  startLimitContext: StartLimitReplacementContext
): number {
  const eligibleSlots = getEligibleSlotTypes(player).filter(isPitcherSlot);
  if (eligibleSlots.length === 0) return 0;

  const slotPars = Object.fromEntries(
    eligibleSlots
      .filter(slot => slot in replacementLevels)
      .map(slot => [slot, computePlayerPARForSlot(projectedPoints, slot, replacementLevels)])
  ) as Partial<Record<SlotType, number>>;

  if (Object.keys(slotPars).length === 0) return 0;

  const normalPar = Math.max(...Object.values(slotPars));
  const reliefReplacementLevel = startLimitContext.reliefReplacementLevel;
  const relieverShare = getRelieverShare(player);
  if (reliefReplacementLevel === null || relieverShare <= 0) return normalPar;

  const starterShare = 1 - relieverShare;
  const reliefPar = Math.round((projectedPoints - reliefReplacementLevel) * 10) / 10;
  const reliefSidePar = Math.max(normalPar, reliefPar);

  return Math.round(
    (starterShare * normalPar + relieverShare * reliefSidePar) * 10
  ) / 10;
}

export function calculatePAR(
  rankedPlayers: RankedPlayer[],
  settings: LeagueSettings
): RankedPlayer[] {
  const rankedPlayersForPar = applyStartScarcityAdjustments(rankedPlayers, settings);
  const relevantSlots: SlotType[] = [
    "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "OF", "IF", "CI", "MI", "UTIL",
    "SP", "RP", "P"
  ];

  const activeSlotCounts = Object.fromEntries(
    relevantSlots
      .map(slot => [slot, getTotalRosterSlots(settings, slot)] as const)
      .filter(([, count]) => count > 0)
  ) as SlotCountMap;
  const assignedPlayerIds = allocatePlayersToSlots(rankedPlayersForPar, activeSlotCounts);

  const replacementLevels = {} as Record<SlotType, number>;
  for (const slot of relevantSlots) {
    if ((activeSlotCounts[slot] ?? 0) === 0) continue;
    replacementLevels[slot] = getReplacementLevelFromRemainingPool(
      rankedPlayersForPar,
      slot,
      settings,
      assignedPlayerIds
    );
  }
  const startLimitContext = getStartLimitReplacementContext(rankedPlayersForPar, settings);

  if (
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "production" &&
    window.localStorage.getItem("pointer:debug-par") === "true"
  ) {
    console.groupCollapsed("PAR replacement levels");
    console.table(replacementLevels);
    console.groupEnd();
  }

  return rankedPlayers.map((rankedPlayer, index) => {
    const player = rankedPlayer.player;
    const projectedPoints = rankedPlayersForPar[index]?.projectedPoints ?? rankedPlayer.projectedPoints;

    let par: number;

    if (player._type === "two-way") {
      const battingPar = computeBatterPAR(player, projectedPoints, replacementLevels);
      const pitchingPar = computePitcherPAR(
        player,
        projectedPoints,
        replacementLevels,
        startLimitContext
      );
      par = Math.max(battingPar, pitchingPar);
    } else if (player._type === "batter") {
      par = computeBatterPAR(player, projectedPoints, replacementLevels);
    } else {
      par = computePitcherPAR(
        player,
        projectedPoints,
        replacementLevels,
        startLimitContext
      );
    }

    return {
      ...rankedPlayer,
      par: Math.round(par * 10) / 10,
    };
  });
}
