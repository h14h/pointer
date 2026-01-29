import type { Player, ScoringSettings, BatterStats, PitcherStats } from "@/types";

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

export function calculatePlayerPoints(
  player: Player,
  settings: ScoringSettings
): number {
  if (player._type === "batter") {
    return calculateBatterPoints(player as BatterStats, settings.batting);
  } else {
    return calculatePitcherPoints(player as PitcherStats, settings.pitching);
  }
}
