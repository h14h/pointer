import type { FootballPlayer, FootballScoringSettings } from "@/types";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function stat(player: FootballPlayer, key: keyof FootballPlayer): number {
  const value = player[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasKickingStats(player: FootballPlayer): boolean {
  return (
    stat(player, "FG") !== 0 ||
    stat(player, "FGA") !== 0 ||
    stat(player, "FG50") !== 0 ||
    stat(player, "FG0_19") !== 0 ||
    stat(player, "FG20_29") !== 0 ||
    stat(player, "FG30_39") !== 0 ||
    stat(player, "FG40_49") !== 0 ||
    stat(player, "FG50_PLUS") !== 0 ||
    stat(player, "FG_MISS") !== 0 ||
    stat(player, "XP") !== 0 ||
    stat(player, "XPA") !== 0 ||
    stat(player, "XP_MISS") !== 0
  );
}

function hasDstStats(player: FootballPlayer): boolean {
  return (
    stat(player, "SACK") !== 0 ||
    stat(player, "DST_INT") !== 0 ||
    stat(player, "FR") !== 0 ||
    stat(player, "FF") !== 0 ||
    stat(player, "DST_TD") !== 0 ||
    stat(player, "ST_TD") !== 0 ||
    stat(player, "ST_FF") !== 0 ||
    stat(player, "ST_FR") !== 0 ||
    stat(player, "FR_TD") !== 0 ||
    stat(player, "SAFETY") !== 0 ||
    stat(player, "BLK") !== 0 ||
    stat(player, "PA0") !== 0 ||
    stat(player, "PA1_6") !== 0 ||
    stat(player, "PA7_13") !== 0 ||
    stat(player, "PA14_20") !== 0 ||
    stat(player, "PA21_27") !== 0 ||
    stat(player, "PA28_34") !== 0 ||
    stat(player, "PA35_PLUS") !== 0
  );
}

function calculateKickingPoints(
  player: FootballPlayer,
  kicking: FootballScoringSettings["kicking"]
): number {
  const rangedFieldGoals =
    stat(player, "FG0_19") +
    stat(player, "FG20_29") +
    stat(player, "FG30_39") +
    stat(player, "FG40_49") +
    stat(player, "FG50_PLUS");

  const madeFieldGoalPoints =
    rangedFieldGoals > 0
      ? stat(player, "FG0_19") * kicking.FG0_19 +
        stat(player, "FG20_29") * kicking.FG20_29 +
        stat(player, "FG30_39") * kicking.FG30_39 +
        stat(player, "FG40_49") * kicking.FG40_49 +
        stat(player, "FG50_PLUS") * kicking.FG50_PLUS
      : Math.max(0, stat(player, "FG") - stat(player, "FG50")) * kicking.FG30_39 +
        stat(player, "FG50") * kicking.FG50_PLUS;

  const missedFieldGoals =
    stat(player, "FG_MISS") || Math.max(0, stat(player, "FGA") - Math.max(stat(player, "FG"), rangedFieldGoals));
  const missedExtraPoints =
    stat(player, "XP_MISS") || Math.max(0, stat(player, "XPA") - stat(player, "XP"));

  return (
    stat(player, "XP") * kicking.XP +
    missedExtraPoints * kicking.XP_MISS +
    madeFieldGoalPoints +
    missedFieldGoals * kicking.FG_MISS
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
    stat(player, "PASS_YDS") * offense.PASS_YDS +
    stat(player, "PASS_TD") * offense.PASS_TD +
    stat(player, "PASS_INT") * offense.PASS_INT +
    stat(player, "RUSH_YDS") * offense.RUSH_YDS +
    stat(player, "RUSH_TD") * offense.RUSH_TD +
    stat(player, "REC") * offense.REC +
    stat(player, "REC_YDS") * offense.REC_YDS +
    stat(player, "REC_TD") * offense.REC_TD +
    stat(player, "TWO_PT") * offense.TWO_PT +
    stat(player, "FUML") * offense.FUML;

  const kickingPoints = calculateKickingPoints(player, kicking);

  const dstPoints =
    stat(player, "SACK") * dst.SACK +
    stat(player, "DST_INT") * dst.INT +
    (stat(player, "FR") + stat(player, "ST_FR")) * dst.FR +
    (stat(player, "FF") + stat(player, "ST_FF")) * dst.FF +
    (stat(player, "DST_TD") + stat(player, "ST_TD") + stat(player, "FR_TD")) * dst.TD +
    stat(player, "SAFETY") * dst.SAFETY +
    stat(player, "BLK") * dst.BLK +
    stat(player, "PA0") * dst.PA0 +
    stat(player, "PA1_6") * dst.PA1_6 +
    stat(player, "PA7_13") * dst.PA7_13 +
    stat(player, "PA14_20") * dst.PA14_20 +
    stat(player, "PA21_27") * dst.PA21_27 +
    stat(player, "PA28_34") * dst.PA28_34 +
    stat(player, "PA35_PLUS") * dst.PA35_PLUS;

  return round1(offensePoints + kickingPoints + dstPoints);
}
