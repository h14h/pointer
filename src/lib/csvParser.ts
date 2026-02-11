import Papa from "papaparse";
import type {
  Player,
  BatterStats,
  PitcherStats,
  TwoWayPlayer,
  BatterPlayer,
  PitcherPlayer,
  IdSource,
} from "@/types";

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
  const pitcherColumns = ["ERA", "WHIP", "IP", "GS", "SV", "QS", "CG", "ShO", "K/9", "BB/9"];

  const batterMatches = batterColumns.filter((col) => headers.includes(col)).length;
  const pitcherMatches = pitcherColumns.filter((col) => headers.includes(col)).length;

  return batterMatches > pitcherMatches ? "batter" : "pitcher";
}

export interface IdConfig {
  source: IdSource;
  customColumn?: string;
}

export type PitchingOutcomeStat = "QS" | "CG" | "ShO";

export type PitchingOutcomeMissingSummary = Record<
  PitchingOutcomeStat,
  {
    totalPlayers: number;
    missingPlayerIds: string[];
  }
>;

function isMissingNumericValue(value: string | undefined): boolean {
  if (value === undefined) return true;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  return isNaN(parseFloat(trimmed));
}

function resolvePlayerId(
  row: Record<string, string>,
  index: number,
  type: "batter" | "pitcher",
  idConfig: IdConfig
): string {
  switch (idConfig.source) {
    case "MLBAMID":
      return row.MLBAMID || row.mlbamid || `${type}-${index}`;
    case "PlayerId":
      return row.PlayerId || row.playerid || `${type}-${index}`;
    case "custom":
      return idConfig.customColumn ? (row[idConfig.customColumn] || `${type}-${index}`) : `${type}-${index}`;
    case "generated":
      return `${type}-${index}`;
  }
}

export function parseBatterRow(
  row: Record<string, string>,
  index: number,
  idConfig: IdConfig
): Player {
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
    _id: resolvePlayerId(row, index, "batter", idConfig),
  };
}

export function parsePitcherRow(
  row: Record<string, string>,
  index: number,
  idConfig: IdConfig
): Player {
  const stats: PitcherStats = {
    Name: row.Name || row.name || "",
    Team: row.Team || row.team || "",
    PlayerId: row.PlayerId || row.playerid || "",
    MLBAMID: row.MLBAMID || row.mlbamid || "",
    W: parseNumber(row.W),
    L: parseNumber(row.L),
    QS: parseNumber(row.QS),
    CG: parseNumber(row.CG),
    ShO: parseNumber(row.ShO),
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
    _id: resolvePlayerId(row, index, "pitcher", idConfig),
  };
}

export interface ParseResult {
  players: Player[];
  type: "batter" | "pitcher";
  rowCount: number;
  errors: string[];
  idSource: IdSource;
  availableColumns: string[];
  needsIdSelection: boolean;
  missingPitchingOutcomes: PitchingOutcomeMissingSummary | null;
}

function detectIdSource(headers: string[]): { source: IdSource; needsSelection: boolean } {
  const hasMLBAMID = headers.some((h) => h.toLowerCase() === "mlbamid");
  const hasPlayerId = headers.some((h) => h.toLowerCase() === "playerid");

  if (hasMLBAMID) {
    return { source: "MLBAMID", needsSelection: false };
  }
  if (hasPlayerId) {
    return { source: "PlayerId", needsSelection: false };
  }
  return { source: "generated", needsSelection: true };
}

export function parsePlayerCSV(
  content: string,
  forceType?: "batter" | "pitcher",
  idConfig?: IdConfig
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
  const { source: detectedSource, needsSelection } = detectIdSource(headers);

  // If no ID config provided and we need selection, return early with metadata
  if (!idConfig && needsSelection) {
    return {
      players: [],
      type,
      rowCount: result.data.length,
      errors,
      idSource: "generated",
      availableColumns: headers,
      needsIdSelection: true,
      missingPitchingOutcomes: null,
    };
  }

  const finalIdConfig: IdConfig = idConfig || { source: detectedSource };
  const missingPitchingOutcomesById: Record<PitchingOutcomeStat, string[]> = {
    QS: [],
    CG: [],
    ShO: [],
  };

  const players: Player[] = result.data
    .map((row, index) => {
      try {
        if (type === "batter") {
          return parseBatterRow(row, index, finalIdConfig);
        } else {
          const pitcher = parsePitcherRow(row, index, finalIdConfig);
          if (pitcher.Name !== "") {
            if (isMissingNumericValue(row.QS)) {
              missingPitchingOutcomesById.QS.push(pitcher._id);
            }
            if (isMissingNumericValue(row.CG)) {
              missingPitchingOutcomesById.CG.push(pitcher._id);
            }
            if (isMissingNumericValue(row.ShO)) {
              missingPitchingOutcomesById.ShO.push(pitcher._id);
            }
          }
          return pitcher;
        }
      } catch (e) {
        errors.push(`Row ${index}: Failed to parse - ${e}`);
        return null;
      }
    })
    .filter((p): p is Player => p !== null && p.Name !== "");

  const missingPitchingOutcomes: PitchingOutcomeMissingSummary | null =
    type === "pitcher"
      ? {
          QS: {
            totalPlayers: players.length,
            missingPlayerIds: Array.from(new Set(missingPitchingOutcomesById.QS)),
          },
          CG: {
            totalPlayers: players.length,
            missingPlayerIds: Array.from(new Set(missingPitchingOutcomesById.CG)),
          },
          ShO: {
            totalPlayers: players.length,
            missingPlayerIds: Array.from(new Set(missingPitchingOutcomesById.ShO)),
          },
        }
      : null;

  return {
    players,
    type,
    rowCount: players.length,
    errors,
    idSource: finalIdConfig.source,
    availableColumns: headers,
    needsIdSelection: false,
    missingPitchingOutcomes,
  };
}

export function extractBattingStats(
  batter: BatterPlayer
): TwoWayPlayer["_battingStats"] {
  return {
    G: batter.G,
    PA: batter.PA,
    AB: batter.AB,
    H: batter.H,
    "1B": batter["1B"],
    "2B": batter["2B"],
    "3B": batter["3B"],
    HR: batter.HR,
    R: batter.R,
    RBI: batter.RBI,
    BB: batter.BB,
    IBB: batter.IBB,
    SO: batter.SO,
    HBP: batter.HBP,
    SF: batter.SF,
    SH: batter.SH,
    GDP: batter.GDP,
    SB: batter.SB,
    CS: batter.CS,
    AVG: batter.AVG,
    OBP: batter.OBP,
    SLG: batter.SLG,
    OPS: batter.OPS,
    ISO: batter.ISO,
    BABIP: batter.BABIP,
    "wRC+": batter["wRC+"],
    WAR: batter.WAR,
  };
}

export function extractPitchingStats(
  pitcher: PitcherPlayer
): TwoWayPlayer["_pitchingStats"] {
  return {
    W: pitcher.W,
    L: pitcher.L,
    QS: pitcher.QS,
    CG: pitcher.CG,
    ShO: pitcher.ShO,
    G: pitcher.G,
    GS: pitcher.GS,
    SV: pitcher.SV,
    HLD: pitcher.HLD,
    BS: pitcher.BS,
    IP: pitcher.IP,
    H: pitcher.H,
    R: pitcher.R,
    ER: pitcher.ER,
    HR: pitcher.HR,
    BB: pitcher.BB,
    IBB: pitcher.IBB,
    HBP: pitcher.HBP,
    SO: pitcher.SO,
    ERA: pitcher.ERA,
    WHIP: pitcher.WHIP,
    "K/9": pitcher["K/9"],
    "BB/9": pitcher["BB/9"],
    FIP: pitcher.FIP,
    WAR: pitcher.WAR,
  };
}

/**
 * Merges newly uploaded players with existing players of the opposite type.
 * Creates TwoWayPlayer entries when a batter and pitcher share the same ID.
 */
export function mergePlayers(
  newPlayers: Player[],
  existingPlayers: Player[],
  newType: "batter" | "pitcher"
): { merged: Player[]; remaining: Player[] } {
  const existingById = new Map(existingPlayers.map((p) => [p._id, p]));
  const merged: Player[] = [];
  const remaining: Player[] = [];

  for (const newPlayer of newPlayers) {
    const existing = existingById.get(newPlayer._id);

    if (existing && existing._type !== newPlayer._type) {
      // Found a match - create two-way player
      const batter = newType === "batter" ? newPlayer : existing;
      const pitcher = newType === "pitcher" ? newPlayer : existing;

      const twoWay: TwoWayPlayer = {
        _type: "two-way",
        _id: newPlayer._id,
        Name: batter.Name || pitcher.Name,
        Team: batter.Team || pitcher.Team,
        PlayerId: (batter as BatterPlayer).PlayerId || (pitcher as PitcherPlayer).PlayerId,
        MLBAMID: (batter as BatterPlayer).MLBAMID || (pitcher as PitcherPlayer).MLBAMID,
        ADP: (batter as BatterPlayer).ADP ?? (pitcher as PitcherPlayer).ADP,
        _battingStats: extractBattingStats(batter as BatterPlayer),
        _pitchingStats: extractPitchingStats(pitcher as PitcherPlayer),
      };

      merged.push(twoWay);
      existingById.delete(newPlayer._id); // Remove from existing so it doesn't stay
    } else {
      remaining.push(newPlayer);
    }
  }

  return { merged, remaining };
}
