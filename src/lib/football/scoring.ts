import type { FootballPlayer, FootballScoringSettings } from "@/types";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function hasKickingStats(player: FootballPlayer): boolean {
  return player.FG !== 0 || player.FGA !== 0 || player.FG50 !== 0 || player.XP !== 0;
}

function hasDstStats(player: FootballPlayer): boolean {
  return (
    player.SACK !== 0 ||
    player.DST_INT !== 0 ||
    player.FR !== 0 ||
    player.FF !== 0 ||
    player.DST_TD !== 0 ||
    player.SAFETY !== 0 ||
    player.BLK !== 0
  );
}

export function calculateFootballPoints(
  player: FootballPlayer,
  scoring: FootballScoringSettings
): number {
  const { offense, kicking, dst } = scoring;

  // K/DST rows from some sources ship aggregate fantasy points instead of
  // component stats — fall back to the provided total in that case.
  if (player.Position === "K" && !hasKickingStats(player) && player.FPTS !== null) {
    return round1(player.FPTS);
  }
  if (player.Position === "DST" && !hasDstStats(player) && player.FPTS !== null) {
    return round1(player.FPTS);
  }

  const offensePoints =
    player.PASS_YDS * offense.PASS_YDS +
    player.PASS_TD * offense.PASS_TD +
    player.PASS_INT * offense.PASS_INT +
    player.RUSH_YDS * offense.RUSH_YDS +
    player.RUSH_TD * offense.RUSH_TD +
    player.REC * offense.REC +
    player.REC_YDS * offense.REC_YDS +
    player.REC_TD * offense.REC_TD +
    player.TWO_PT * offense.TWO_PT +
    player.FUML * offense.FUML;

  const kickingPoints =
    player.XP * kicking.XP + player.FG * kicking.FG + player.FG50 * kicking.FG50;

  const dstPoints =
    player.SACK * dst.SACK +
    player.DST_INT * dst.INT +
    player.FR * dst.FR +
    player.FF * dst.FF +
    player.DST_TD * dst.TD +
    player.SAFETY * dst.SAFETY +
    player.BLK * dst.BLK;

  return round1(offensePoints + kickingPoints + dstPoints);
}
