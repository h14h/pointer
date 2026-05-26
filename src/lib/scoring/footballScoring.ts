import type { FootballPlayer, FootballScoringSettings } from "@/types";

export function calculateFootballPlayerPoints(
  player: FootballPlayer,
  settings: FootballScoringSettings
): number {
  let points = 0;
  points += (player.PassYds || 0) * settings.passing.PassYds;
  points += (player.PassTD || 0) * settings.passing.PassTD;
  points += (player.Int || 0) * settings.passing.Int;
  points += (player.RushYds || 0) * settings.rushing.RushYds;
  points += (player.RushTD || 0) * settings.rushing.RushTD;
  points += (player.Rec || 0) * settings.receiving.Rec;
  points += (player.RecYds || 0) * settings.receiving.RecYds;
  points += (player.RecTD || 0) * settings.receiving.RecTD;
  points += (player["2PT"] || 0) * settings.misc["2PT"];
  points += (player.FumLost || 0) * settings.misc.FumLost;
  return Math.round(points * 10) / 10;
}
