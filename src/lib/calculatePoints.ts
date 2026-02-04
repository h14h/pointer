import type { Player, ScoringSettings, BatterStats, PitcherStats, TwoWayPlayer } from "@/types";

export function calculateBatterPoints(
  player: BatterStats,
  settings: ScoringSettings["batting"]
): number {
  let points = 0;

  points += (player.R || 0) * settings.R;
  points += (player["1B"] || 0) * settings["1B"];
  points += (player["2B"] || 0) * settings["2B"];
  points += (player["3B"] || 0) * settings["3B"];
  points += (player.HR || 0) * settings.HR;
  points += (player.RBI || 0) * settings.RBI;
  points += (player.SB || 0) * settings.SB;
  points += (player.CS || 0) * settings.CS;
  points += (player.BB || 0) * settings.BB;
  points += (player.SO || 0) * settings.SO;
  points += (player.HBP || 0) * settings.HBP;
  points += (player.SF || 0) * settings.SF;
  points += (player.GDP || 0) * settings.GDP;

  // If scoring all hits generically (rare, but supported)
  if (settings.H !== 0) {
    points += (player.H || 0) * settings.H;
  }

  return Math.round(points * 10) / 10; // Round to 1 decimal
}

export function calculatePitcherPoints(
  player: PitcherStats,
  settings: ScoringSettings["pitching"]
): number {
  let points = 0;

  points += (player.IP || 0) * settings.IP;
  points += (player.W || 0) * settings.W;
  points += (player.L || 0) * settings.L;
  points += (player.QS || 0) * settings.QS;
  points += (player.SV || 0) * settings.SV;
  points += (player.BS || 0) * settings.BS;
  points += (player.HLD || 0) * settings.HLD;
  points += (player.SO || 0) * settings.SO;
  points += (player.H || 0) * settings.H;
  points += (player.ER || 0) * settings.ER;
  points += (player.HR || 0) * settings.HR;
  points += (player.BB || 0) * settings.BB;
  points += (player.HBP || 0) * settings.HBP;

  return Math.round(points * 10) / 10; // Round to 1 decimal
}

function calculateTwoWayBattingPoints(
  stats: TwoWayPlayer["_battingStats"],
  settings: ScoringSettings["batting"]
): number {
  let points = 0;

  points += (stats.R || 0) * settings.R;
  points += (stats["1B"] || 0) * settings["1B"];
  points += (stats["2B"] || 0) * settings["2B"];
  points += (stats["3B"] || 0) * settings["3B"];
  points += (stats.HR || 0) * settings.HR;
  points += (stats.RBI || 0) * settings.RBI;
  points += (stats.SB || 0) * settings.SB;
  points += (stats.CS || 0) * settings.CS;
  points += (stats.BB || 0) * settings.BB;
  points += (stats.SO || 0) * settings.SO;
  points += (stats.HBP || 0) * settings.HBP;
  points += (stats.SF || 0) * settings.SF;
  points += (stats.GDP || 0) * settings.GDP;

  if (settings.H !== 0) {
    points += (stats.H || 0) * settings.H;
  }

  return points;
}

function calculateTwoWayPitchingPoints(
  stats: TwoWayPlayer["_pitchingStats"],
  settings: ScoringSettings["pitching"]
): number {
  let points = 0;

  points += (stats.IP || 0) * settings.IP;
  points += (stats.W || 0) * settings.W;
  points += (stats.L || 0) * settings.L;
  points += (stats.QS || 0) * settings.QS;
  points += (stats.SV || 0) * settings.SV;
  points += (stats.BS || 0) * settings.BS;
  points += (stats.HLD || 0) * settings.HLD;
  points += (stats.SO || 0) * settings.SO;
  points += (stats.H || 0) * settings.H;
  points += (stats.ER || 0) * settings.ER;
  points += (stats.HR || 0) * settings.HR;
  points += (stats.BB || 0) * settings.BB;
  points += (stats.HBP || 0) * settings.HBP;

  return points;
}

export function calculatePlayerPoints(
  player: Player,
  settings: ScoringSettings,
  viewMode?: "all" | "batters" | "pitchers"
): number {
  if (player._type === "batter") {
    return calculateBatterPoints(player as BatterStats, settings.batting);
  } else if (player._type === "pitcher") {
    return calculatePitcherPoints(player as PitcherStats, settings.pitching);
  } else {
    // Two-way player
    const twoWay = player as TwoWayPlayer;
    if (viewMode === "batters") {
      return Math.round(calculateTwoWayBattingPoints(twoWay._battingStats, settings.batting) * 10) / 10;
    } else if (viewMode === "pitchers") {
      return Math.round(calculateTwoWayPitchingPoints(twoWay._pitchingStats, settings.pitching) * 10) / 10;
    } else {
      // Combined points for "all" view
      const battingPoints = calculateTwoWayBattingPoints(twoWay._battingStats, settings.batting);
      const pitchingPoints = calculateTwoWayPitchingPoints(twoWay._pitchingStats, settings.pitching);
      return Math.round((battingPoints + pitchingPoints) * 10) / 10;
    }
  }
}
