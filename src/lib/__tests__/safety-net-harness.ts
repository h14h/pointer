// Safety Net Harness
// This is the ONLY file whose imports may change during the deep-modules refactoring.
// All safety-net test scenarios import exclusively from this file.

// ---- Types ----
export type {
  BatterPlayer,
  BatterStats,
  PitcherPlayer,
  PitcherStats,
  TwoWayPlayer,
  Player,
  ScoringSettings,
  LeagueSettings,
  RosterSettings,
  RosterSlot,
  Position,
  DraftState,
  DraftPick,
  DraftFormat,
  ProjectionGroup,
  RankedPlayer,
  Eligibility,
} from "@/types";

// ---- Scoring ----
export {
  calculateBatterPoints,
  calculatePitcherPoints,
  calculatePlayerPoints,
  normalizeIp,
  isValidBaseballIp,
} from "@/lib/scoring";
export type { NormalizedIp } from "@/lib/scoring";

// ---- Draft ----
export {
  getDraftPickContext,
  getNextOpenPickIndex,
  createDraftPick,
  hasManualDraftActivity,
  hasDraftActivity,
} from "@/lib/draft";
export type { DraftPickContext } from "@/lib/draft";

// ---- Eligibility ----
export {
  computeHitterEligibility,
  computePitcherEligibility,
  mergeTwoWayEligibility,
  emptyPositionGames,
  POSITION_ORDER,
} from "@/lib/eligibility";

// ---- Pitching Outcomes ----
export { estimateQualityStarts } from "@/lib/projections";

// ---- Player Search ----
export {
  buildPlayerSearchText,
  normalizePlayerSearchText,
} from "@/lib/leaderboard";

// ---- Leaderboard ----
export {
  buildBaseRankedPlayers,
  buildFilterMetadata,
  filterRankedPlayers,
  sortLeaderboardRows,
  formatEligibilityForLeaderboard,
} from "@/lib/leaderboard";
export type {
  LeaderboardRow,
  PlayerView,
  DraftFilter,
} from "@/lib/leaderboard";

// ---- PAR ----
export { calculatePAR } from "@/lib/leaderboard";

// ---- CSV Parser ----
export { parsePlayerCSV } from "@/lib/projections";
export type { ParseResult } from "@/lib/projections";
