import type { Player, ScoringSettings, PitcherStats, TwoWayPlayer, BaseballScoringSettings } from "@/types";
import { normalizeIp } from "./ipMath";
import { calculateBatterPoints } from "./batterScoring";
import { calculateFootballPlayerPoints } from "./footballScoring";

export function calculatePitcherPoints(
  player: PitcherStats,
  settings: BaseballScoringSettings["pitching"],
  useBaseballIp = false
): number {
  let points = 0;

  if (useBaseballIp) {
    const ipInfo = normalizeIp(player.IP || 0);
    points += (ipInfo.valid ? ipInfo.innings : 0) * settings.IP;
  } else {
    points += (player.IP || 0) * settings.IP;
  }
  points += (player.W || 0) * settings.W;
  points += (player.L || 0) * settings.L;
  points += (player.QS || 0) * settings.QS;
  points += (player.CG || 0) * settings.CG;
  points += (player.ShO || 0) * settings.ShO;
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
  settings: BaseballScoringSettings["batting"]
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
  points += (stats.IBB || 0) * (settings.IBB ?? 0);
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
  settings: BaseballScoringSettings["pitching"],
  useBaseballIp = false
): number {
  let points = 0;

  if (useBaseballIp) {
    const ipInfo = normalizeIp(stats.IP || 0);
    points += (ipInfo.valid ? ipInfo.innings : 0) * settings.IP;
  } else {
    points += (stats.IP || 0) * settings.IP;
  }
  points += (stats.W || 0) * settings.W;
  points += (stats.L || 0) * settings.L;
  points += (stats.QS || 0) * settings.QS;
  points += (stats.CG || 0) * settings.CG;
  points += (stats.ShO || 0) * settings.ShO;
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

function isBaseballScoringSettings(settings: ScoringSettings): settings is BaseballScoringSettings {
  return "batting" in settings;
}

export function calculatePlayerPoints(
  player: Player,
  settings: ScoringSettings,
  viewMode?: "all" | "batters" | "pitchers",
  useBaseballIp = false
): number {
  if (player._type === "football-player") {
    if ("passing" in settings) {
      return calculateFootballPlayerPoints(player, settings);
    }
    return 0;
  }
  if (!isBaseballScoringSettings(settings)) {
    return 0;
  }
  if (player._type === "batter") {
    return calculateBatterPoints(player, settings.batting);
  } else if (player._type === "pitcher") {
    return calculatePitcherPoints(player, settings.pitching, useBaseballIp);
  } else {
    // Two-way player
    const twoWay = player as TwoWayPlayer;
    if (viewMode === "batters") {
      return Math.round(calculateTwoWayBattingPoints(twoWay._battingStats, settings.batting) * 10) / 10;
    } else if (viewMode === "pitchers") {
      return Math.round(
        calculateTwoWayPitchingPoints(twoWay._pitchingStats, settings.pitching, useBaseballIp) * 10
      ) / 10;
    } else {
      // Combined points for "all" view
      const battingPoints = calculateTwoWayBattingPoints(twoWay._battingStats, settings.batting);
      const pitchingPoints = calculateTwoWayPitchingPoints(
        twoWay._pitchingStats,
        settings.pitching,
        useBaseballIp
      );
      return Math.round((battingPoints + pitchingPoints) * 10) / 10;
    }
  }
}
