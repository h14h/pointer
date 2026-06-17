import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

type SupportedPosition = "QB" | "RB" | "WR" | "TE" | "K";

type NflversePlayerRow = Record<string, string | number | null | undefined>;
type NflverseTeamRow = Record<string, string | number | null | undefined>;

export type NflverseFootballCsvOptions = {
  season: number;
  outPath: string;
  includeDst: boolean;
};

export const FOOTBALL_CSV_COLUMNS = [
  "Name",
  "Team",
  "Position",
  "PlayerId",
  "BYE",
  "PASS_ATT",
  "PASS_CMP",
  "PASS_YDS",
  "PASS_TD",
  "PASS_INT",
  "RUSH_ATT",
  "RUSH_YDS",
  "RUSH_TD",
  "TGT",
  "REC",
  "REC_YDS",
  "REC_TD",
  "TWO_PT",
  "FUML",
  "FG",
  "FGA",
  "FG50",
  "XP",
  "SACK",
  "DST_INT",
  "FR",
  "FF",
  "DST_TD",
  "SAFETY",
  "BLK",
  "PTS_ALLOWED",
  "FPTS",
  "ADP",
] as const;

export type PointerFootballCsvRow = Record<(typeof FOOTBALL_CSV_COLUMNS)[number], string | number>;

const SUPPORTED_POSITIONS = new Set<SupportedPosition>(["QB", "RB", "WR", "TE", "K"]);
const NFLVERSE_BASE_URL = "https://github.com/nflverse/nflverse-data/releases/download";

function getArgValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function getRequiredArg(args: string[], flag: string): string {
  const value = getArgValue(args, flag);
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing required argument: ${flag}`);
  }
  return value;
}

export function parseNflverseFootballCsvOptions(args: string[]): NflverseFootballCsvOptions {
  const season = Number(getRequiredArg(args, "--season"));
  if (!Number.isInteger(season) || season < 1999 || season > 2100) {
    throw new Error("`--season` must be a valid NFL season year.");
  }

  return {
    season,
    outPath:
      getArgValue(args, "--out") ??
      path.join(process.cwd(), "data", "nflverse", `football-stats-${season}.csv`),
    includeDst: !hasFlag(args, "--no-dst"),
  };
}

function seasonPlayerStatsUrl(season: number): string {
  return `${NFLVERSE_BASE_URL}/stats_player/stats_player_reg_${season}.csv`;
}

function seasonTeamStatsUrl(season: number): string {
  return `${NFLVERSE_BASE_URL}/stats_team/stats_team_reg_${season}.csv`;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function parseCsvRows<T extends Record<string, unknown>>(csv: string, label: string): T[] {
  const result = Papa.parse<T>(csv, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    const messages = result.errors.slice(0, 5).map((error) => error.message).join("; ");
    throw new Error(`Unable to parse ${label} CSV: ${messages}`);
  }

  return result.data;
}

function numberValue(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (trimmed.length === 0) return 0;
  const parsed = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

function blankOutputRow(): Pick<
  PointerFootballCsvRow,
  | "BYE"
  | "PASS_ATT"
  | "PASS_CMP"
  | "PASS_YDS"
  | "PASS_TD"
  | "PASS_INT"
  | "RUSH_ATT"
  | "RUSH_YDS"
  | "RUSH_TD"
  | "TGT"
  | "REC"
  | "REC_YDS"
  | "REC_TD"
  | "TWO_PT"
  | "FUML"
  | "FG"
  | "FGA"
  | "FG50"
  | "XP"
  | "SACK"
  | "DST_INT"
  | "FR"
  | "FF"
  | "DST_TD"
  | "SAFETY"
  | "BLK"
  | "PTS_ALLOWED"
  | "FPTS"
  | "ADP"
> {
  return {
    BYE: "",
    PASS_ATT: 0,
    PASS_CMP: 0,
    PASS_YDS: 0,
    PASS_TD: 0,
    PASS_INT: 0,
    RUSH_ATT: 0,
    RUSH_YDS: 0,
    RUSH_TD: 0,
    TGT: 0,
    REC: 0,
    REC_YDS: 0,
    REC_TD: 0,
    TWO_PT: 0,
    FUML: 0,
    FG: 0,
    FGA: 0,
    FG50: 0,
    XP: 0,
    SACK: 0,
    DST_INT: 0,
    FR: 0,
    FF: 0,
    DST_TD: 0,
    SAFETY: 0,
    BLK: 0,
    PTS_ALLOWED: 0,
    FPTS: "",
    ADP: "",
  };
}

export function mapNflversePlayerToPointerRow(row: NflversePlayerRow): PointerFootballCsvRow | null {
  const position = stringValue(row, "position");
  if (!SUPPORTED_POSITIONS.has(position as SupportedPosition)) return null;

  const playerId = stringValue(row, "player_id");
  const name = stringValue(row, "player_display_name") || stringValue(row, "player_name");
  if (!playerId || !name) return null;

  return {
    Name: name,
    Team: stringValue(row, "recent_team"),
    Position: position,
    PlayerId: playerId,
    ...blankOutputRow(),
    PASS_ATT: numberValue(row, "attempts"),
    PASS_CMP: numberValue(row, "completions"),
    PASS_YDS: numberValue(row, "passing_yards"),
    PASS_TD: numberValue(row, "passing_tds"),
    PASS_INT: numberValue(row, "passing_interceptions"),
    RUSH_ATT: numberValue(row, "carries"),
    RUSH_YDS: numberValue(row, "rushing_yards"),
    RUSH_TD: numberValue(row, "rushing_tds"),
    TGT: numberValue(row, "targets"),
    REC: numberValue(row, "receptions"),
    REC_YDS: numberValue(row, "receiving_yards"),
    REC_TD: numberValue(row, "receiving_tds"),
    TWO_PT:
      numberValue(row, "passing_2pt_conversions") +
      numberValue(row, "rushing_2pt_conversions") +
      numberValue(row, "receiving_2pt_conversions"),
    FUML:
      numberValue(row, "sack_fumbles_lost") +
      numberValue(row, "rushing_fumbles_lost") +
      numberValue(row, "receiving_fumbles_lost"),
    FG: numberValue(row, "fg_made"),
    FGA: numberValue(row, "fg_att"),
    FG50: numberValue(row, "fg_made_50_59") + numberValue(row, "fg_made_60_"),
    XP: numberValue(row, "pat_made"),
  };
}

export function mapNflverseTeamToDstRow(row: NflverseTeamRow): PointerFootballCsvRow | null {
  const team = stringValue(row, "team");
  if (!team) return null;

  return {
    Name: `${team} DST`,
    Team: team,
    Position: "DST",
    PlayerId: `DST-${team}`,
    ...blankOutputRow(),
    SACK: numberValue(row, "def_sacks"),
    DST_INT: numberValue(row, "def_interceptions"),
    FR: numberValue(row, "fumble_recovery_opp"),
    FF: numberValue(row, "def_fumbles_forced"),
    DST_TD:
      numberValue(row, "def_tds") +
      numberValue(row, "fumble_recovery_tds") +
      numberValue(row, "special_teams_tds"),
    SAFETY: numberValue(row, "def_safeties"),
    BLK: 0,
  };
}

function sortRows(left: PointerFootballCsvRow, right: PointerFootballCsvRow): number {
  const positionOrder = ["QB", "RB", "WR", "TE", "K", "DST"];
  const leftPosition = positionOrder.indexOf(String(left.Position));
  const rightPosition = positionOrder.indexOf(String(right.Position));
  if (leftPosition !== rightPosition) return leftPosition - rightPosition;
  return String(left.Name).localeCompare(String(right.Name));
}

export async function buildNflverseFootballCsv(
  options: NflverseFootballCsvOptions
): Promise<{ csv: string; rows: PointerFootballCsvRow[] }> {
  const [playerCsv, teamCsv] = await Promise.all([
    fetchText(seasonPlayerStatsUrl(options.season)),
    options.includeDst ? fetchText(seasonTeamStatsUrl(options.season)) : Promise.resolve(""),
  ]);

  const playerRows = parseCsvRows<NflversePlayerRow>(playerCsv, "nflverse player stats")
    .map(mapNflversePlayerToPointerRow)
    .filter((row): row is PointerFootballCsvRow => row !== null);

  const dstRows = options.includeDst
    ? parseCsvRows<NflverseTeamRow>(teamCsv, "nflverse team stats")
        .map(mapNflverseTeamToDstRow)
        .filter((row): row is PointerFootballCsvRow => row !== null)
    : [];

  const rows = [...playerRows, ...dstRows].sort(sortRows);
  const csv = Papa.unparse(rows, { columns: [...FOOTBALL_CSV_COLUMNS] });
  return { csv: `${csv}\n`, rows };
}

async function main() {
  const options = parseNflverseFootballCsvOptions(process.argv.slice(2));
  const { csv, rows } = await buildNflverseFootballCsv(options);

  await mkdir(path.dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, csv, "utf8");

  console.log(`Wrote ${rows.length} football rows to ${options.outPath}`);
  console.log(`Source: ${seasonPlayerStatsUrl(options.season)}`);
  if (options.includeDst) {
    console.log(`DST source: ${seasonTeamStatsUrl(options.season)}`);
  }
}

const isMainModule =
  typeof process.argv[1] === "string" &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
