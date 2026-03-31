// Core eligibility rules
export {
  emptyPositionGames,
  normalizePositionGames,
  computeHitterEligibility,
  computePitcherEligibility,
  mergeTwoWayEligibility,
  mergeWarnings,
  POSITION_ORDER,
  eligibilityFromProfilePosition,
} from "./rules";

// Formatting
export { formatEligibilityForLeaderboard } from "./format";

// MLB Stats API
export {
  fetchSeasonFieldingStats,
  fetchSeasonPitchingStats,
  fetchSeasonStatsForPlayers,
  _internal as mlbStatsApiInternal,
} from "./mlbStatsApi";
// Also export _internal at the same name for backward compat via shim
export { _internal } from "./mlbStatsApi";

// Import orchestration
export {
  runProjectionEligibilityImport,
} from "./import";
export type { ProjectionEligibilityImportCallbacks } from "./import";
