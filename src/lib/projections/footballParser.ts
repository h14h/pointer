import Papa from "papaparse";
import type { FootballPlayer, FootballPosition } from "@/types";
import { randomUUID } from "@/lib/uuid";

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

const VALID_POSITIONS: FootballPosition[] = ["QB", "RB", "WR", "TE"];

export function isFootballCsv(columns: string[]): boolean {
  const footballCols = [
    "PassYds",
    "PassTD",
    "Int",
    "RushYds",
    "RushTD",
    "Rec",
    "RecYds",
    "RecTD",
  ];
  return footballCols.some((col) => columns.includes(col));
}

function resolveName(row: Record<string, string>): string {
  return row.Name || row.name || row.Player || row.player || "";
}

function resolveTeam(row: Record<string, string>): string {
  return row.Team || row.team || row.Tm || row.tm || "";
}

function resolvePosition(row: Record<string, string>): FootballPosition | null {
  const raw = row.Position || row.Pos || row.position || row.pos || "";
  const normalized = raw.trim().toUpperCase();
  if (VALID_POSITIONS.includes(normalized as FootballPosition)) {
    return normalized as FootballPosition;
  }
  return null;
}

function resolveTwoPt(row: Record<string, string>): number {
  const value =
    row["2PT"] ??
    row["2Pt"] ??
    row["TwoPt"] ??
    row["twoPt"] ??
    row["TwoPT"] ??
    row["2pt"] ??
    undefined;
  return parseNumber(value);
}

function resolveFumLost(row: Record<string, string>): number {
  const value =
    row.FumLost ??
    row.fumLost ??
    row.Fumbles ??
    row.fumbles ??
    row.Fum ??
    row.fum ??
    undefined;
  return parseNumber(value);
}

export function parseFootballCsv(content: string): FootballPlayer[] {
  const delimiter = detectDelimiter(content);

  const result = Papa.parse<Record<string, string>>(content, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const headers = result.meta.fields || [];
  if (!isFootballCsv(headers)) {
    return [];
  }

  return result.data
    .map((row) => {
      const position = resolvePosition(row);
      if (!position) {
        return null;
      }

      const player: FootballPlayer = {
        _type: "football-player",
        _id: randomUUID(),
        Name: resolveName(row),
        Team: resolveTeam(row),
        Position: position,
        PassYds: parseNumber(row.PassYds),
        PassTD: parseNumber(row.PassTD),
        Int: parseNumber(row.Int),
        RushYds: parseNumber(row.RushYds),
        RushTD: parseNumber(row.RushTD),
        Rec: parseNumber(row.Rec),
        RecYds: parseNumber(row.RecYds),
        RecTD: parseNumber(row.RecTD),
        "2PT": resolveTwoPt(row),
        FumLost: resolveFumLost(row),
        ADP: parseNullableNumber(row.ADP),
      };

      return player;
    })
    .filter((p): p is FootballPlayer => p !== null && p.Name !== "");
}
