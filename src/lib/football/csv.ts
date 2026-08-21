import Papa from "papaparse";
import type { FootballPlayer, FootballPosition, FootballStats } from "@/types";

// ---------------------------------------------------------------------------
// Football projections CSV parsing
//
// Supports two header styles:
// 1. Explicit headers ("Pass Yds", "RUSH_TD", "Rec", ...) — mapped via aliases.
// 2. FantasyPros-style sectioned headers, where bare tokens (ATT/YDS/TDS/INT)
//    repeat across passing/rushing/receiving blocks — resolved with a
//    stateful left-to-right walk over the header row.
// ---------------------------------------------------------------------------

export interface FootballParseResult {
  players: FootballPlayer[];
  rowCount: number;
  errors: string[];
  warnings: string[];
  availableColumns: string[];
  /** Inferred file-level position when the CSV has no position column. */
  detectedPosition: FootballPosition | null;
  /** True when no position column exists and inference failed. */
  needsPositionSelection: boolean;
  /** True when rows were classified individually instead of one file-level position. */
  mixedPositions: boolean;
  /** Rows skipped because position could not be mapped or inferred. */
  skippedPositionRows: number;
}

export interface FootballParseOptions {
  /** Position to assign to rows that lack a position column. */
  forcePosition?: FootballPosition;
  /** Classify each row on its own (column or per-row stats). Do not force one slot. */
  mixedPositions?: boolean;
}

type CanonicalField =
  | keyof Omit<FootballStats, "Position" | "BYE" | "ADP" | "FPTS">
  | "POS"
  | "BYE"
  | "ADP"
  | "FPTS"
  | "PLAYERID";

function detectDelimiter(content: string): string {
  const firstLine = content.split("\n")[0] || "";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? "\t" : ",";
}

function normalizeHeaderToken(header: string): string {
  return header
    .replace(/^\ufeff/, "")
    .trim()
    .toUpperCase()
    .replace(/\+/g, " PLUS ")
    .replace(/\./g, "")
    .replace(/[()]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Unambiguous header aliases (already-normalized token → canonical field)
const HEADER_ALIASES: Record<string, CanonicalField> = {
  PLAYER: "Name",
  NAME: "Name",
  "PLAYER NAME": "Name",
  TEAM: "Team",
  TM: "Team",
  POS: "POS",
  POSITION: "POS",
  POSN: "POS",
  "PLAYER POS": "POS",
  "PLAYER POSITION": "POS",
  "ROSTER POSITION": "POS",
  "FANTASY POSITION": "POS",
  "FANTASY POS": "POS",
  ELIG: "POS",
  ELIGIBLE: "POS",
  ELIGIBILITY: "POS",
  BYE: "BYE",
  "BYE WEEK": "BYE",
  ADP: "ADP",
  "AVG PICK": "ADP",
  "AVG DRAFT POSITION": "ADP",
  FPTS: "FPTS",
  "FANTASY POINTS": "FPTS",
  "MISC FPTS": "FPTS",
  PTS: "FPTS",
  POINTS: "FPTS",
  PLAYERID: "PLAYERID",
  "PLAYER ID": "PLAYERID",
  ID: "PLAYERID",

  "PASS ATT": "PASS_ATT",
  "PASSING ATT": "PASS_ATT",
  "PASS ATTEMPTS": "PASS_ATT",
  CMP: "PASS_CMP",
  COMP: "PASS_CMP",
  COMPLETIONS: "PASS_CMP",
  "PASS CMP": "PASS_CMP",
  "PASS YDS": "PASS_YDS",
  "PASSING YDS": "PASS_YDS",
  "PASS YARDS": "PASS_YDS",
  "PASS TD": "PASS_TD",
  "PASS TDS": "PASS_TD",
  "PASSING TD": "PASS_TD",
  "PASS INT": "PASS_INT",

  "RUSH ATT": "RUSH_ATT",
  "RUSHING ATT": "RUSH_ATT",
  CARRIES: "RUSH_ATT",
  "RUSH YDS": "RUSH_YDS",
  "RUSHING YDS": "RUSH_YDS",
  "RUSH YARDS": "RUSH_YDS",
  "RUSH TD": "RUSH_TD",
  "RUSH TDS": "RUSH_TD",
  "RUSHING TD": "RUSH_TD",

  TGT: "TGT",
  TARGETS: "TGT",
  REC: "REC",
  RECEPTIONS: "REC",
  CATCHES: "REC",
  "REC YDS": "REC_YDS",
  "RECEIVING YDS": "REC_YDS",
  "REC YARDS": "REC_YDS",
  "REC TD": "REC_TD",
  "REC TDS": "REC_TD",
  "RECEIVING TD": "REC_TD",

  "2PT": "TWO_PT",
  "2 PT": "TWO_PT",
  "TWO PT": "TWO_PT",
  FL: "FUML",
  FUM: "FUML",
  FUML: "FUML",
  FUMBLES: "FUML",
  "FUMBLES LOST": "FUML",
  "FUM LOST": "FUML",

  FG: "FG",
  FGM: "FG",
  "FG MADE": "FG",
  FGA: "FGA",
  "FG ATT": "FGA",
  FG50: "FG50",
  "FG 50": "FG50",
  "FG 50+": "FG50",
  "FG 0 19": "FG0_19",
  "FGM 0 19": "FG0_19",
  "FG MADE 0 19": "FG0_19",
  "FG MADE 0 19 YARDS": "FG0_19",
  "FG 20 29": "FG20_29",
  "FGM 20 29": "FG20_29",
  "FG MADE 20 29": "FG20_29",
  "FG MADE 20 29 YARDS": "FG20_29",
  "FG 30 39": "FG30_39",
  "FGM 30 39": "FG30_39",
  "FG MADE 30 39": "FG30_39",
  "FG MADE 30 39 YARDS": "FG30_39",
  "FG 40 49": "FG40_49",
  "FGM 40 49": "FG40_49",
  "FG MADE 40 49": "FG40_49",
  "FG MADE 40 49 YARDS": "FG40_49",
  "FG 50 PLUS": "FG50_PLUS",
  "FGM 50 PLUS": "FG50_PLUS",
  "FG MADE 50 PLUS": "FG50_PLUS",
  "FG MADE 50 PLUS YARDS": "FG50_PLUS",
  "FG MISSED": "FG_MISS",
  "FG MISS": "FG_MISS",
  "MISSED FG": "FG_MISS",
  FGMISS: "FG_MISS",
  "50+": "FG50",
  "50 PLUS": "FG50_PLUS",
  XPA: "XPA",
  "XP ATT": "XPA",
  "PAT ATT": "XPA",
  XP: "XP",
  XPT: "XP",
  XPM: "XP",
  "XP MADE": "XP",
  PAT: "XP",
  "PAT MADE": "XP",
  "XP MISSED": "XP_MISS",
  "XP MISS": "XP_MISS",
  "PAT MISSED": "XP_MISS",
  "PAT MISS": "XP_MISS",

  SACK: "SACK",
  SACKS: "SACK",
  "DST INT": "DST_INT",
  "DEF INT": "DST_INT",
  FR: "FR",
  "FUM REC": "FR",
  "FUMBLE RECOVERIES": "FR",
  FF: "FF",
  "FORCED FUMBLES": "FF",
  "DST TD": "DST_TD",
  "DEF TD": "DST_TD",
  "DEFENSE TD": "DST_TD",
  "DEFENSIVE TD": "DST_TD",
  "SPECIAL TEAMS TD": "ST_TD",
  "SPECIAL TEAMS DEFENSE TD": "ST_TD",
  "SPECIAL TEAMS FF": "ST_FF",
  "SPECIAL TEAMS FORCED FUMBLE": "ST_FF",
  "SPECIAL TEAMS FR": "ST_FR",
  "SPECIAL TEAMS FUMBLE RECOVERY": "ST_FR",
  "FUMBLE RECOVERY TD": "FR_TD",
  "FR TD": "FR_TD",
  SAFETY: "SAFETY",
  SAFETIES: "SAFETY",
  SFTY: "SAFETY",
  BLK: "BLK",
  BLOCKS: "BLK",
  "BLOCKED KICKS": "BLK",
  PA: "PTS_ALLOWED",
  "PTS ALLOWED": "PTS_ALLOWED",
  "POINTS ALLOWED": "PTS_ALLOWED",
  "POINTS ALLOWED 0": "PA0",
  "PTS ALLOWED 0": "PA0",
  "PA 0": "PA0",
  "POINTS ALLOWED 1 6": "PA1_6",
  "PTS ALLOWED 1 6": "PA1_6",
  "PA 1 6": "PA1_6",
  "POINTS ALLOWED 7 13": "PA7_13",
  "PTS ALLOWED 7 13": "PA7_13",
  "PA 7 13": "PA7_13",
  "POINTS ALLOWED 14 20": "PA14_20",
  "PTS ALLOWED 14 20": "PA14_20",
  "PA 14 20": "PA14_20",
  "POINTS ALLOWED 21 27": "PA21_27",
  "PTS ALLOWED 21 27": "PA21_27",
  "PA 21 27": "PA21_27",
  "POINTS ALLOWED 28 34": "PA28_34",
  "PTS ALLOWED 28 34": "PA28_34",
  "PA 28 34": "PA28_34",
  "POINTS ALLOWED 35 PLUS": "PA35_PLUS",
  "PTS ALLOWED 35 PLUS": "PA35_PLUS",
  "PA 35 PLUS": "PA35_PLUS",
};

type Section = "passing" | "rushing" | "receiving" | "dst" | null;

const SECTION_BY_FIELD: Partial<Record<CanonicalField, Section>> = {
  PASS_ATT: "passing",
  PASS_CMP: "passing",
  PASS_YDS: "passing",
  PASS_TD: "passing",
  PASS_INT: "passing",
  RUSH_ATT: "rushing",
  RUSH_YDS: "rushing",
  RUSH_TD: "rushing",
  TGT: "receiving",
  REC: "receiving",
  REC_YDS: "receiving",
  REC_TD: "receiving",
  SACK: "dst",
  DST_INT: "dst",
  FR: "dst",
  FF: "dst",
  DST_TD: "dst",
  SAFETY: "dst",
  BLK: "dst",
  PTS_ALLOWED: "dst",
  PA0: "dst",
  PA1_6: "dst",
  PA7_13: "dst",
  PA14_20: "dst",
  PA21_27: "dst",
  PA28_34: "dst",
  PA35_PLUS: "dst",
};

type HeaderResolution = {
  /** canonical field per column index (null = unmapped/ignored) */
  fieldsByIndex: (CanonicalField | null)[];
  /** order in which offensive sections first appeared (for position inference) */
  sectionOrder: Section[];
  warnings: string[];
};

function resolveHeaders(rawHeaders: string[]): HeaderResolution {
  const tokens = rawHeaders.map(normalizeHeaderToken);
  const fieldsByIndex: (CanonicalField | null)[] = Array(tokens.length).fill(null);
  const seen = new Set<CanonicalField>();
  const sectionOrder: Section[] = [];
  const warnings: string[] = [];
  let section: Section = null;

  const enterSection = (next: Section) => {
    if (next && !sectionOrder.includes(next)) sectionOrder.push(next);
    section = next;
  };

  const assign = (index: number, field: CanonicalField) => {
    if (seen.has(field)) {
      warnings.push(`Duplicate column "${rawHeaders[index]}" ignored.`);
      return;
    }
    seen.add(field);
    fieldsByIndex[index] = field;
    const fieldSection = SECTION_BY_FIELD[field];
    if (fieldSection) enterSection(fieldSection);
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    const direct = HEADER_ALIASES[token];
    if (direct) {
      assign(i, direct);
      continue;
    }

    // Ambiguous bare tokens — resolve from the current section
    switch (token) {
      case "ATT":
      case "ATTEMPTS": {
        // FantasyPros QB layout opens with ATT, CMP — passing block
        if (tokens[i + 1] === "CMP" || tokens[i + 1] === "COMP") {
          assign(i, "PASS_ATT");
        } else if (section === "passing" && !seen.has("PASS_ATT")) {
          assign(i, "PASS_ATT");
        } else {
          assign(i, "RUSH_ATT");
        }
        break;
      }
      case "YDS":
      case "YARDS": {
        if (section === "passing") assign(i, "PASS_YDS");
        else if (section === "rushing") assign(i, "RUSH_YDS");
        else if (section === "receiving") assign(i, "REC_YDS");
        // dst yardage-against columns are intentionally ignored
        else if (section !== "dst") {
          warnings.push(`Ambiguous column "${rawHeaders[i]}" ignored (no preceding section).`);
        }
        break;
      }
      case "TD":
      case "TDS": {
        if (section === "passing") assign(i, "PASS_TD");
        else if (section === "rushing") assign(i, "RUSH_TD");
        else if (section === "receiving") assign(i, "REC_TD");
        else if (section === "dst") assign(i, "DST_TD");
        else warnings.push(`Ambiguous column "${rawHeaders[i]}" ignored (no preceding section).`);
        break;
      }
      case "INT":
      case "INTS": {
        if (section === "dst") assign(i, "DST_INT");
        else if (section === "passing") assign(i, "PASS_INT");
        else if (tokens.includes("SACK") || tokens.includes("SACKS")) assign(i, "DST_INT");
        else assign(i, "PASS_INT");
        break;
      }
      default:
        break;
    }
  }

  return { fieldsByIndex, sectionOrder, warnings };
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseNullableNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function normalizeFootballPosition(value: string | undefined): FootballPosition | null {
  if (!value) return null;
  // Strip positional ranks like "RB12" and whitespace
  const cleaned = value.trim().toUpperCase().replace(/[\s.]/g, "").replace(/\d+$/, "");
  const primary = cleaned.split("/")[0] ?? cleaned;
  switch (primary) {
    case "QB":
    case "QUARTERBACK":
      return "QB";
    case "RB":
    case "HB":
    case "FB":
    case "RUNNINGBACK":
      return "RB";
    case "WR":
    case "WIDERECEIVER":
      return "WR";
    case "TE":
    case "TIGHTEND":
      return "TE";
    case "K":
    case "PK":
    case "KICKER":
      return "K";
    case "DST":
    case "D/ST":
    case "DEF":
    case "D":
    case "DEFENSE":
    case "SPECIALTEAMS":
    case "TEAMDEF":
      return "DST";
    default:
      return null;
  }
}

function inferRowPosition(stats: {
  PASS_CMP: number;
  PASS_INT: number;
  PASS_ATT: number;
  PASS_YDS: number;
  RUSH_ATT: number;
  RUSH_YDS: number;
  RUSH_TD: number;
  TGT: number;
  REC: number;
  REC_YDS: number;
  REC_TD: number;
  FG: number;
  XP: number;
  SACK: number;
}): FootballPosition | null {
  if (stats.FG > 0 && stats.XP > 0) return "K";
  if (stats.SACK > 0) return "DST";
  if (stats.PASS_CMP > 0 || stats.PASS_INT > 0 || stats.PASS_ATT > 0 || stats.PASS_YDS > 0) return "QB";

  const hasRush = stats.RUSH_ATT > 0 || stats.RUSH_YDS > 0 || stats.RUSH_TD > 0;
  const hasRec = stats.REC > 0 || stats.REC_YDS > 0 || stats.TGT > 0 || stats.REC_TD > 0;
  if (hasRec && !hasRush) return "TE";
  if (hasRush && (!hasRec || stats.RUSH_YDS >= stats.REC_YDS)) return "RB";
  if (hasRec) return "WR";
  return null;
}

function inferFilePosition(
  resolution: HeaderResolution,
  fields: Set<CanonicalField>
): FootballPosition | null {
  if (fields.has("FG") && fields.has("XP")) return "K";
  if (fields.has("SACK")) return "DST";
  if (fields.has("PASS_CMP") || fields.has("PASS_INT")) return "QB";

  const offensiveOrder = resolution.sectionOrder.filter(
    (s): s is "rushing" | "receiving" => s === "rushing" || s === "receiving"
  );
  if (offensiveOrder.length === 1 && offensiveOrder[0] === "receiving") return "TE";
  if (offensiveOrder[0] === "rushing") return "RB";
  if (offensiveOrder[0] === "receiving") return "WR";
  return null;
}

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildFootballPlayerId(name: string, position: FootballPosition): string {
  return `fb-${slugifyName(name)}-${position.toLowerCase()}`;
}

export function parseFootballCsv(
  content: string,
  options?: FootballParseOptions
): FootballParseResult {
  const delimiter = detectDelimiter(content);
  const errors: string[] = [];

  const result = Papa.parse<string[]>(content, {
    delimiter,
    header: false,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    result.errors.forEach((err) => {
      errors.push(`Row ${err.row}: ${err.message}`);
    });
  }

  const rows = result.data;
  const rawHeaders = (rows[0] ?? []).map((h) => h.trim());
  const dataRows = rows.slice(1);

  const resolution = resolveHeaders(rawHeaders);
  const warnings = [...resolution.warnings];
  const mappedFields = new Set(
    resolution.fieldsByIndex.filter((f): f is CanonicalField => f !== null)
  );

  const indexByField = new Map<CanonicalField, number>();
  resolution.fieldsByIndex.forEach((field, index) => {
    if (field !== null) indexByField.set(field, index);
  });

  const getValue = (row: string[], field: CanonicalField): string | undefined => {
    const index = indexByField.get(field);
    return index === undefined ? undefined : row[index];
  };

  const hasPositionColumn = mappedFields.has("POS");
  const mixedPositions = options?.mixedPositions === true;
  let detectedPosition: FootballPosition | null = null;
  if (!hasPositionColumn && !options?.forcePosition && !mixedPositions) {
    detectedPosition = inferFilePosition(resolution, mappedFields);
    if (detectedPosition) {
      warnings.push(
        `No position column found — all players imported as ${detectedPosition}. ` +
          "Override the position if this is wrong."
      );
    }
  }

  const filePosition = mixedPositions ? undefined : (options?.forcePosition ?? detectedPosition);
  const useMixedFallback = mixedPositions || (!hasPositionColumn && !filePosition);

  let skippedPositionRows = 0;
  const players: FootballPlayer[] = [];

  dataRows.forEach((row) => {
    const name = (getValue(row, "Name") ?? "").trim();
    if (name === "") return;

    const rowStats = {
      PASS_CMP: parseNumber(getValue(row, "PASS_CMP")),
      PASS_INT: parseNumber(getValue(row, "PASS_INT")),
      PASS_ATT: parseNumber(getValue(row, "PASS_ATT")),
      PASS_YDS: parseNumber(getValue(row, "PASS_YDS")),
      RUSH_ATT: parseNumber(getValue(row, "RUSH_ATT")),
      RUSH_YDS: parseNumber(getValue(row, "RUSH_YDS")),
      RUSH_TD: parseNumber(getValue(row, "RUSH_TD")),
      TGT: parseNumber(getValue(row, "TGT")),
      REC: parseNumber(getValue(row, "REC")),
      REC_YDS: parseNumber(getValue(row, "REC_YDS")),
      REC_TD: parseNumber(getValue(row, "REC_TD")),
      FG: parseNumber(getValue(row, "FG")),
      XP: parseNumber(getValue(row, "XP")),
      SACK: parseNumber(getValue(row, "SACK")),
    };
    const fromColumn = hasPositionColumn
      ? normalizeFootballPosition(getValue(row, "POS"))
      : null;
    const position =
      fromColumn ??
      (useMixedFallback ? inferRowPosition(rowStats) : null) ??
      filePosition ??
      null;
    if (!position) {
      skippedPositionRows += 1;
      return;
    }

    const providedId = (getValue(row, "PLAYERID") ?? "").trim();

    players.push({
      _type: "football",
      _id: providedId || buildFootballPlayerId(name, position),
      Name: name,
      Team: (getValue(row, "Team") ?? "").trim(),
      PlayerId: providedId,
      Position: position,
      BYE: parseNullableNumber(getValue(row, "BYE")),
      PASS_ATT: parseNumber(getValue(row, "PASS_ATT")),
      PASS_CMP: parseNumber(getValue(row, "PASS_CMP")),
      PASS_YDS: parseNumber(getValue(row, "PASS_YDS")),
      PASS_TD: parseNumber(getValue(row, "PASS_TD")),
      PASS_INT: parseNumber(getValue(row, "PASS_INT")),
      RUSH_ATT: parseNumber(getValue(row, "RUSH_ATT")),
      RUSH_YDS: parseNumber(getValue(row, "RUSH_YDS")),
      RUSH_TD: parseNumber(getValue(row, "RUSH_TD")),
      TGT: parseNumber(getValue(row, "TGT")),
      REC: parseNumber(getValue(row, "REC")),
      REC_YDS: parseNumber(getValue(row, "REC_YDS")),
      REC_TD: parseNumber(getValue(row, "REC_TD")),
      TWO_PT: parseNumber(getValue(row, "TWO_PT")),
      FUML: parseNumber(getValue(row, "FUML")),
      FG: parseNumber(getValue(row, "FG")),
      FGA: parseNumber(getValue(row, "FGA")),
      FG50: parseNumber(getValue(row, "FG50")),
      FG0_19: parseNumber(getValue(row, "FG0_19")),
      FG20_29: parseNumber(getValue(row, "FG20_29")),
      FG30_39: parseNumber(getValue(row, "FG30_39")),
      FG40_49: parseNumber(getValue(row, "FG40_49")),
      FG50_PLUS: parseNumber(getValue(row, "FG50_PLUS")),
      FG_MISS: parseNumber(getValue(row, "FG_MISS")),
      XPA: parseNumber(getValue(row, "XPA")),
      XP: parseNumber(getValue(row, "XP")),
      XP_MISS: parseNumber(getValue(row, "XP_MISS")),
      SACK: parseNumber(getValue(row, "SACK")),
      DST_INT: parseNumber(getValue(row, "DST_INT")),
      FR: parseNumber(getValue(row, "FR")),
      FF: parseNumber(getValue(row, "FF")),
      DST_TD: parseNumber(getValue(row, "DST_TD")),
      ST_TD: parseNumber(getValue(row, "ST_TD")),
      ST_FF: parseNumber(getValue(row, "ST_FF")),
      ST_FR: parseNumber(getValue(row, "ST_FR")),
      FR_TD: parseNumber(getValue(row, "FR_TD")),
      SAFETY: parseNumber(getValue(row, "SAFETY")),
      BLK: parseNumber(getValue(row, "BLK")),
      PTS_ALLOWED: parseNumber(getValue(row, "PTS_ALLOWED")),
      PA0: parseNumber(getValue(row, "PA0")),
      PA1_6: parseNumber(getValue(row, "PA1_6")),
      PA7_13: parseNumber(getValue(row, "PA7_13")),
      PA14_20: parseNumber(getValue(row, "PA14_20")),
      PA21_27: parseNumber(getValue(row, "PA21_27")),
      PA28_34: parseNumber(getValue(row, "PA28_34")),
      PA35_PLUS: parseNumber(getValue(row, "PA35_PLUS")),
      FPTS: parseNullableNumber(getValue(row, "FPTS")),
      ADP: parseNullableNumber(getValue(row, "ADP")),
    });
  });

  if (skippedPositionRows > 0) {
    warnings.push(`${skippedPositionRows} row(s) skipped — could not classify position.`);
  }

  const usedMixed = useMixedFallback && !filePosition;
  if (usedMixed && players.length === 0 && !hasPositionColumn && !options?.forcePosition && !mixedPositions) {
    return {
      players: [],
      rowCount: dataRows.length,
      errors,
      warnings: warnings.filter((warning) => !warning.includes("could not classify position")),
      availableColumns: rawHeaders,
      detectedPosition: null,
      needsPositionSelection: true,
      mixedPositions: false,
      skippedPositionRows: 0,
    };
  }

  return {
    players,
    rowCount: players.length,
    errors,
    warnings,
    availableColumns: rawHeaders,
    detectedPosition,
    needsPositionSelection: false,
    mixedPositions: usedMixed,
    skippedPositionRows,
  };
}

/**
 * Merges newly parsed players into an existing football player list (e.g.
 * uploading per-position files into one projection group). Players with the
 * same id are replaced by the newer upload.
 */
export function mergeFootballPlayers(
  existing: FootballPlayer[],
  incoming: FootballPlayer[]
): FootballPlayer[] {
  const incomingIds = new Set(incoming.map((p) => p._id));
  return [...existing.filter((p) => !incomingIds.has(p._id)), ...incoming];
}
