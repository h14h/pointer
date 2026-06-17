import { describe, expect, it } from "vitest";
import {
  mapNflversePlayerToDraftSpaRow,
  mapNflverseTeamToDstRow,
  parseNflverseFootballCsvOptions,
} from "../../scripts/generate-nflverse-football-csv";

describe("generate nflverse football csv script", () => {
  it("parses CLI options with a deterministic default output path", () => {
    const options = parseNflverseFootballCsvOptions(["--season", "2024"]);

    expect(options.season).toBe(2024);
    expect(options.outPath).toContain("data/nflverse/football-stats-2024.csv");
    expect(options.includeDst).toBe(true);
  });

  it("maps nflverse offensive player stats into DraftSpa football columns", () => {
    const row = mapNflversePlayerToDraftSpaRow({
      player_id: "00-0034796",
      player_display_name: "Lamar Jackson",
      position: "QB",
      recent_team: "BAL",
      completions: "316",
      attempts: "474",
      passing_yards: "4172",
      passing_tds: "41",
      passing_interceptions: "4",
      carries: "139",
      rushing_yards: "915",
      rushing_tds: "4",
      passing_2pt_conversions: "1",
      rushing_2pt_conversions: "1",
      sack_fumbles_lost: "2",
      rushing_fumbles_lost: "1",
    });

    expect(row).toMatchObject({
      Name: "Lamar Jackson",
      Team: "BAL",
      Position: "QB",
      PlayerId: "00-0034796",
      PASS_ATT: 474,
      PASS_CMP: 316,
      PASS_YDS: 4172,
      PASS_TD: 41,
      PASS_INT: 4,
      RUSH_ATT: 139,
      RUSH_YDS: 915,
      RUSH_TD: 4,
      TWO_PT: 2,
      FUML: 3,
    });
  });

  it("maps nflverse team defense stats into DST rows", () => {
    const row = mapNflverseTeamToDstRow({
      team: "PIT",
      def_sacks: "40",
      def_interceptions: "17",
      fumble_recovery_opp: "12",
      def_fumbles_forced: "18",
      def_tds: "3",
      fumble_recovery_tds: "1",
      special_teams_tds: "2",
      def_safeties: "1",
    });

    expect(row).toMatchObject({
      Name: "PIT DST",
      Team: "PIT",
      Position: "DST",
      PlayerId: "DST-PIT",
      SACK: 40,
      DST_INT: 17,
      FR: 12,
      FF: 18,
      DST_TD: 6,
      SAFETY: 1,
    });
  });
});
