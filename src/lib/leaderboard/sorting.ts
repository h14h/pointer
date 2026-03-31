import type { SortingState } from "@tanstack/react-table";
import { formatEligibilityForLeaderboard } from "@/lib/eligibility";
import type { LeaderboardRow } from "./types";

function getStatValue(row: LeaderboardRow, columnId: string): number | null {
  if (row.player._type === "pitcher") {
    switch (columnId) {
      case "IP":
        return row.player.IP;
      case "SO_P":
        return row.player.SO;
      case "H_P":
        return row.player.H;
      case "ER":
        return row.player.ER;
      case "HR_P":
        return row.player.HR;
      case "BB_P":
        return row.player.BB;
      case "HBP_P":
        return row.player.HBP;
      case "W":
        return row.player.W;
      case "L":
        return row.player.L;
      case "QS":
        return row.player.QS;
      case "SV":
        return row.player.SV;
      case "HLD":
        return row.player.HLD;
      case "BS":
        return row.player.BS;
      case "CG":
        return row.player.CG;
      case "ShO":
        return row.player.ShO;
      case "ERA":
        return row.player.ERA;
      case "WHIP":
        return row.player.WHIP;
      default:
        return null;
    }
  }

  if (row.player._type === "two-way") {
    switch (columnId) {
      case "H":
        return row.player._battingStats.H;
      case "1B":
        return row.player._battingStats["1B"];
      case "2B":
        return row.player._battingStats["2B"];
      case "3B":
        return row.player._battingStats["3B"];
      case "TB":
        return (
          row.player._battingStats["1B"] +
          row.player._battingStats["2B"] * 2 +
          row.player._battingStats["3B"] * 3 +
          row.player._battingStats.HR * 4
        );
      case "HR":
        return row.player._battingStats.HR;
      case "R":
        return row.player._battingStats.R;
      case "RBI":
        return row.player._battingStats.RBI;
      case "BB":
        return row.player._battingStats.BB;
      case "IBB":
        return row.player._battingStats.IBB;
      case "HBP":
        return row.player._battingStats.HBP;
      case "SO":
        return row.player._battingStats.SO;
      case "SB":
        return row.player._battingStats.SB;
      case "CS":
        return row.player._battingStats.CS;
      case "SF":
        return row.player._battingStats.SF;
      case "GDP":
        return row.player._battingStats.GDP;
      case "AVG":
        return row.player._battingStats.AVG;
      case "IP":
        return row.player._pitchingStats.IP;
      case "SO_P":
        return row.player._pitchingStats.SO;
      case "H_P":
        return row.player._pitchingStats.H;
      case "ER":
        return row.player._pitchingStats.ER;
      case "HR_P":
        return row.player._pitchingStats.HR;
      case "BB_P":
        return row.player._pitchingStats.BB;
      case "HBP_P":
        return row.player._pitchingStats.HBP;
      case "W":
        return row.player._pitchingStats.W;
      case "L":
        return row.player._pitchingStats.L;
      case "QS":
        return row.player._pitchingStats.QS;
      case "SV":
        return row.player._pitchingStats.SV;
      case "HLD":
        return row.player._pitchingStats.HLD;
      case "BS":
        return row.player._pitchingStats.BS;
      case "CG":
        return row.player._pitchingStats.CG;
      case "ShO":
        return row.player._pitchingStats.ShO;
      case "ERA":
        return row.player._pitchingStats.ERA;
      case "WHIP":
        return row.player._pitchingStats.WHIP;
      default:
        return null;
    }
  }

  switch (columnId) {
    case "H":
      return row.player.H;
    case "1B":
      return row.player["1B"];
    case "2B":
      return row.player["2B"];
    case "3B":
      return row.player["3B"];
    case "TB":
      return row.player["1B"] + row.player["2B"] * 2 + row.player["3B"] * 3 + row.player.HR * 4;
    case "HR":
      return row.player.HR;
    case "R":
      return row.player.R;
    case "RBI":
      return row.player.RBI;
    case "BB":
      return row.player.BB;
    case "IBB":
      return row.player.IBB;
    case "HBP":
      return row.player.HBP;
    case "SO":
      return row.player.SO;
    case "SB":
      return row.player.SB;
    case "CS":
      return row.player.CS;
    case "SF":
      return row.player.SF;
    case "GDP":
      return row.player.GDP;
    case "AVG":
      return row.player.AVG;
    default:
      return null;
  }
}

function getSortValue(row: LeaderboardRow, columnId: string): number | string | null {
  switch (columnId) {
    case "ADP":
      return row.player.ADP;
    case "player.Name":
    case "player_Name":
      return row.player.Name;
    case "player.Team":
    case "player_Team":
      return row.player.Team;
    case "player._type":
    case "player__type":
      return row.player._type;
    case "eligibility":
      return formatEligibilityForLeaderboard(row.player);
    case "projectedPoints":
      return row.projectedPoints;
    case "par":
      return row.par;
    default:
      return getStatValue(row, columnId);
  }
}

function compareSortValues(
  left: number | string | null,
  right: number | string | null
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function sortLeaderboardRows(
  rows: LeaderboardRow[],
  sorting: SortingState
): LeaderboardRow[] {
  if (sorting.length === 0) return [...rows];

  return [...rows].sort((left, right) => {
    for (const sortEntry of sorting) {
      const leftVal = getSortValue(left, sortEntry.id);
      const rightVal = getSortValue(right, sortEntry.id);

      // Nulls (displayed as "-") always sort to the bottom, regardless of direction
      const leftNull = leftVal == null;
      const rightNull = rightVal == null;
      if (leftNull || rightNull) {
        if (leftNull && rightNull) continue;
        return leftNull ? 1 : -1;
      }

      const comparison = compareSortValues(leftVal, rightVal);

      if (comparison !== 0) {
        return sortEntry.desc ? -comparison : comparison;
      }
    }

    return left.player._id.localeCompare(right.player._id);
  });
}
