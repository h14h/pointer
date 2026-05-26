import type { Player, RankedPlayer, LeagueSettings, RosterSlot, Position } from "@/types";

type SlotType = RosterSlot;
const AVERAGE_STARTS_PER_ROSTERED_SP_PER_WEEK = 2;
type PitchingUsage = { G: number; GS: number };

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
  QB: [],
  RB: [],
  WR: [],
  TE: [],
  Flex: [],
  K: [],
  DST: [],
  Bench: [],
};

function isBatterSlot(slot: SlotType): boolean {
  return slot in SLOT_POSITION_MAP && SLOT_POSITION_MAP[slot].length > 0;
}

function isPitcherSlot(slot: SlotType): boolean {
  return slot === "SP" || slot === "RP" || slot === "P";
}

function isFootballSlot(slot: SlotType): boolean {
  return ["QB", "RB", "WR", "TE", "Flex"].includes(slot);
}

function getTotalRosterSlots(settings: LeagueSettings, slot: SlotType): number {
  return (settings.roster.positions[slot] ?? 0) * settings.leagueSize;
}

export function getEligibleSlotTypes(player: Player): SlotType[] {
  const slots: SlotType[] = [];

  if (player._type === "football-player") {
    slots.push(player.Position);
    if (["RB", "WR", "TE"].includes(player.Position)) slots.push("Flex");
    return slots;
  }

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
  if (player._type === "football-player") {
    if (slot === "Flex") {
      return ["RB", "WR", "TE"].includes(player.Position);
    }
    return player.Position === slot;
  }
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
  if (player._type === "football-player") {
    return null;
  }
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

function getWeightedRoleReplacementLevel(
  rankedPlayers: RankedPlayerForPAR[],
  targetRoleDemand: number,
  getRoleShare: (player: Player) => number
): number {
  const eligiblePlayers = getSortedPlayers(rankedPlayers).filter(rp =>
    getProjectedPitchingGames(rp.player) !== null
  );

  if (eligiblePlayers.length === 0) return 0;
  if (targetRoleDemand <= 0) return eligiblePlayers[0].projectedPoints;

  let cumulativeRoleShare = 0;

  for (const rankedPlayer of eligiblePlayers) {
    const roleShare = Math.max(0, getRoleShare(rankedPlayer.player));
    if (roleShare <= 0) continue;

    cumulativeRoleShare += roleShare;
    if (cumulativeRoleShare > targetRoleDemand) {
      return rankedPlayer.projectedPoints;
    }
  }

  return 0;
}

function getPitcherReplacementLevelsWithStartLimit(
  rankedPlayers: RankedPlayerForPAR[],
  settings: LeagueSettings
): Partial<Record<SlotType, number>> {
  const weeklyStartLimit = settings.weeklyStartLimit ?? null;
  if (weeklyStartLimit === null || weeklyStartLimit <= 0) return {};

  const perTeamSpSlots = settings.roster.positions.SP ?? 0;
  const perTeamRpSlots = settings.roster.positions.RP ?? 0;
  const perTeamPitcherFlexSlots = settings.roster.positions.P ?? 0;

  if (perTeamSpSlots + perTeamPitcherFlexSlots === 0) return {};

  const cappedTotalSpSlotsPerTeam = Math.max(
    perTeamSpSlots,
    Math.min(
      perTeamSpSlots + perTeamPitcherFlexSlots,
      Math.ceil(weeklyStartLimit / AVERAGE_STARTS_PER_ROSTERED_SP_PER_WEEK)
    )
  );
  const cappedFlexibleSpSlotsPerTeam = Math.max(0, cappedTotalSpSlotsPerTeam - perTeamSpSlots);
  const reliefLikeSlotsPerTeam =
    perTeamRpSlots + Math.max(0, perTeamPitcherFlexSlots - cappedFlexibleSpSlotsPerTeam);

  const spReplacement = getWeightedRoleReplacementLevel(
    rankedPlayers,
    cappedTotalSpSlotsPerTeam * settings.leagueSize,
    getStarterShare
  );
  const rpReplacement = getWeightedRoleReplacementLevel(
    rankedPlayers,
    reliefLikeSlotsPerTeam * settings.leagueSize,
    getRelieverShare
  );

  return {
    SP: spReplacement,
    RP: rpReplacement,
    P: Math.max(spReplacement, rpReplacement),
  };
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
  settings: LeagueSettings
): number {
  const eligibleSlots = getEligibleSlotTypes(player).filter(isPitcherSlot);
  if (eligibleSlots.length === 0) return 0;

  const useWeightedRolePar = (settings.weeklyStartLimit ?? 0) > 0;
  const slotPars = Object.fromEntries(
    eligibleSlots
      .filter(slot => slot in replacementLevels)
      .map(slot => [slot, computePlayerPARForSlot(projectedPoints, slot, replacementLevels)])
  ) as Partial<Record<SlotType, number>>;

  if (Object.keys(slotPars).length === 0) return 0;

  if (!useWeightedRolePar) {
    return Math.max(...Object.values(slotPars));
  }

  const starterShare = getStarterShare(player);
  const relieverShare = getRelieverShare(player);
  const blendedPar =
    starterShare * (slotPars.SP ?? slotPars.P ?? 0)
    + relieverShare * (slotPars.RP ?? slotPars.P ?? 0);

  return Math.round(blendedPar * 10) / 10;
}

function computeFootballPAR(
  player: Player,
  projectedPoints: number,
  replacementLevels: Record<SlotType, number>
): number {
  const eligibleSlots = getEligibleSlotTypes(player).filter(isFootballSlot);
  if (eligibleSlots.length === 0) return 0;

  let maxPar = Number.NEGATIVE_INFINITY;
  for (const slot of eligibleSlots) {
    if (!(slot in replacementLevels)) continue;
    const par = computePlayerPARForSlot(projectedPoints, slot, replacementLevels);
    if (par > maxPar) maxPar = par;
  }
  return maxPar === Number.NEGATIVE_INFINITY ? 0 : maxPar;
}

export function calculatePAR(
  rankedPlayers: RankedPlayer[],
  settings: LeagueSettings
): RankedPlayer[] {
  const relevantSlots: SlotType[] = settings.sport === "football"
    ? ["QB", "RB", "WR", "TE", "Flex"]
    : ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "OF", "IF", "CI", "MI", "UTIL", "SP", "RP", "P"];

  const activeSlotCounts = Object.fromEntries(
    relevantSlots
      .map(slot => [slot, getTotalRosterSlots(settings, slot)] as const)
      .filter(([, count]) => count > 0)
  ) as SlotCountMap;
  const assignedPlayerIds = allocatePlayersToSlots(rankedPlayers, activeSlotCounts);

  const replacementLevels = {} as Record<SlotType, number>;
  for (const slot of relevantSlots) {
    if ((activeSlotCounts[slot] ?? 0) === 0) continue;
    replacementLevels[slot] = getReplacementLevelFromRemainingPool(
      rankedPlayers,
      slot,
      settings,
      assignedPlayerIds
    );
  }

  const pitcherReplacementLevels = getPitcherReplacementLevelsWithStartLimit(
    rankedPlayers,
    settings
  );
  for (const [slot, replacement] of Object.entries(pitcherReplacementLevels)) {
    if (replacement === undefined) continue;
    replacementLevels[slot as SlotType] = replacement;
  }

  if (
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "production" &&
    window.localStorage.getItem("pointer:debug-par") === "true"
  ) {
    console.groupCollapsed("PAR replacement levels");
    console.table(replacementLevels);
    console.groupEnd();
  }

  return rankedPlayers.map(rankedPlayer => {
    const player = rankedPlayer.player;
    const projectedPoints = rankedPlayer.projectedPoints;

    let par: number;

    if (player._type === "two-way") {
      const battingPar = computeBatterPAR(player, projectedPoints, replacementLevels);
      const pitchingPar = computePitcherPAR(player, projectedPoints, replacementLevels, settings);
      par = Math.max(battingPar, pitchingPar);
    } else if (player._type === "batter") {
      par = computeBatterPAR(player, projectedPoints, replacementLevels);
    } else if (player._type === "football-player") {
      par = computeFootballPAR(player, projectedPoints, replacementLevels);
    } else {
      par = computePitcherPAR(player, projectedPoints, replacementLevels, settings);
    }

    return {
      ...rankedPlayer,
      par: Math.round(par * 10) / 10,
    };
  });
}
