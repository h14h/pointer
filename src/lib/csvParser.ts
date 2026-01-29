import Papa from "papaparse";
import type { Player, BatterStats, PitcherStats } from "@/types";

// Parse numeric value, returning 0 for empty/invalid
function parseNumber(value: string | undefined): number {
  if (!value || value.trim() === "") return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// Parse nullable number (for ADP which may be empty)
function parseNullableNumber(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// Detect if file is TSV or CSV
function detectDelimiter(content: string): string {
  const firstLine = content.split("\n")[0] || "";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? "\t" : ",";
}

// Detect if data is batters or pitchers based on columns
function detectPlayerType(headers: string[]): "batter" | "pitcher" {
  const batterColumns = ["PA", "AB", "1B", "2B", "3B", "SB", "CS", "AVG", "OBP", "SLG"];
  const pitcherColumns = ["ERA", "WHIP", "IP", "GS", "SV", "QS", "K/9", "BB/9"];

  const batterMatches = batterColumns.filter((col) => headers.includes(col)).length;
  const pitcherMatches = pitcherColumns.filter((col) => headers.includes(col)).length;

  return batterMatches > pitcherMatches ? "batter" : "pitcher";
}

export function parseBatterRow(row: Record<string, string>, index: number): Player {
  const stats: BatterStats = {
    Name: row.Name || row.name || "",
    Team: row.Team || row.team || "",
    PlayerId: row.PlayerId || row.playerid || "",
    MLBAMID: row.MLBAMID || row.mlbamid || "",
    G: parseNumber(row.G),
    PA: parseNumber(row.PA),
    AB: parseNumber(row.AB),
    H: parseNumber(row.H),
    "1B": parseNumber(row["1B"]),
    "2B": parseNumber(row["2B"]),
    "3B": parseNumber(row["3B"]),
    HR: parseNumber(row.HR),
    R: parseNumber(row.R),
    RBI: parseNumber(row.RBI),
    BB: parseNumber(row.BB),
    IBB: parseNumber(row.IBB),
    SO: parseNumber(row.SO),
    HBP: parseNumber(row.HBP),
    SF: parseNumber(row.SF),
    SH: parseNumber(row.SH),
    GDP: parseNumber(row.GDP),
    SB: parseNumber(row.SB),
    CS: parseNumber(row.CS),
    AVG: parseNumber(row.AVG),
    OBP: parseNumber(row.OBP),
    SLG: parseNumber(row.SLG),
    OPS: parseNumber(row.OPS),
    ISO: parseNumber(row.ISO),
    BABIP: parseNumber(row.BABIP),
    "wRC+": parseNumber(row["wRC+"]),
    WAR: parseNumber(row.WAR),
    ADP: parseNullableNumber(row.ADP),
  };

  return {
    ...stats,
    _type: "batter",
    _id: stats.PlayerId || `batter-${index}`,
  };
}

export function parsePitcherRow(row: Record<string, string>, index: number): Player {
  const stats: PitcherStats = {
    Name: row.Name || row.name || "",
    Team: row.Team || row.team || "",
    PlayerId: row.PlayerId || row.playerid || "",
    MLBAMID: row.MLBAMID || row.mlbamid || "",
    W: parseNumber(row.W),
    L: parseNumber(row.L),
    QS: parseNumber(row.QS),
    G: parseNumber(row.G),
    GS: parseNumber(row.GS),
    SV: parseNumber(row.SV),
    HLD: parseNumber(row.HLD),
    BS: parseNumber(row.BS),
    IP: parseNumber(row.IP),
    H: parseNumber(row.H),
    R: parseNumber(row.R),
    ER: parseNumber(row.ER),
    HR: parseNumber(row.HR),
    BB: parseNumber(row.BB),
    IBB: parseNumber(row.IBB),
    HBP: parseNumber(row.HBP),
    SO: parseNumber(row.SO),
    ERA: parseNumber(row.ERA),
    WHIP: parseNumber(row.WHIP),
    "K/9": parseNumber(row["K/9"]),
    "BB/9": parseNumber(row["BB/9"]),
    FIP: parseNumber(row.FIP),
    WAR: parseNumber(row.WAR),
    ADP: parseNullableNumber(row.ADP),
  };

  return {
    ...stats,
    _type: "pitcher",
    _id: stats.PlayerId || `pitcher-${index}`,
  };
}

export interface ParseResult {
  players: Player[];
  type: "batter" | "pitcher";
  rowCount: number;
  errors: string[];
}

export function parsePlayerCSV(
  content: string,
  forceType?: "batter" | "pitcher"
): ParseResult {
  const delimiter = detectDelimiter(content);
  const errors: string[] = [];

  const result = Papa.parse<Record<string, string>>(content, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    result.errors.forEach((err) => {
      errors.push(`Row ${err.row}: ${err.message}`);
    });
  }

  const headers = result.meta.fields || [];
  const type = forceType || detectPlayerType(headers);

  const players: Player[] = result.data
    .map((row, index) => {
      try {
        if (type === "batter") {
          return parseBatterRow(row, index);
        } else {
          return parsePitcherRow(row, index);
        }
      } catch (e) {
        errors.push(`Row ${index}: Failed to parse - ${e}`);
        return null;
      }
    })
    .filter((p): p is Player => p !== null && p.Name !== "");

  return {
    players,
    type,
    rowCount: players.length,
    errors,
  };
}
