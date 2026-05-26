import type { BatterStats, BaseballScoringSettings } from "@/types";

export function calculateBatterPoints(
  player: BatterStats,
  settings: BaseballScoringSettings["batting"]
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
  points += (player.IBB || 0) * (settings.IBB ?? 0);
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
