// Pure view-model builders for the draft room. Everything here is
// render-agnostic: given a league + projection group, produce the unified
// player pool (both sports), the tape cells, and small formatting helpers.

import { getDraftPickContext, type ReservedKeeperPick } from "@/lib/draft";
import { formatEligibilityForLeaderboard } from "@/lib/eligibility";
import {
  buildFootballRankedPlayers,
  normalizeFootballConfig,
  sortFootballRankedPlayers,
} from "@/lib/football";
import { buildBaseRankedPlayers, normalizePlayerSearchText } from "@/lib/leaderboard";
import type { DraftFormat, DraftPick, League, ProjectionGroup } from "@/types";

/* ---------------------------------------------------------------------------
   Types
   --------------------------------------------------------------------------- */

/** Sport-agnostic player row used by the board, quick log, tape, and wire. */
export type RoomPlayer = {
  id: string;
  name: string;
  /** Display position — football Position, baseball eligibility string */
  pos: string;
  team: string;
  /** Football bye week; null for baseball or missing data */
  bye: number | null;
  points: number;
  par: number;
  isDrafted: boolean;
  isKeeper: boolean;
  /** Coarse kind for position filtering */
  kind: "batter" | "pitcher" | "two-way" | "football";
  /** Lowercased haystack for quick-log / board search */
  searchText: string;
};

export type TapeCell = {
  slotIndex: number;
  overall: number;
  round: number;
  pickInRound: number;
  teamIndex: number;
  teamAbbrev: string;
  /** Short player name when the slot is filled (history or keeper) */
  playerName: string | null;
  isKeeper: boolean;
  isMine: boolean;
};

export type MyRosterRow = {
  id: string;
  round: number | null;
  name: string;
  isKeeper: boolean;
};

export type WireRow = {
  overall: number;
  playerName: string;
  teamAbbrev: string;
  isMine: boolean;
};

export type LoggedPick = {
  overall: number;
  playerName: string;
  teamName: string;
};

/* ---------------------------------------------------------------------------
   Formatting helpers
   --------------------------------------------------------------------------- */

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** "R3.04" — round.pick slot label */
export const slotLabel = (round: number, pickInRound: number) =>
  `R${round}.${pad2(pickInRound)}`;

/** Abbreviate a team name to ~3 characters for tape cells and the wire. */
export function abbrevTeamName(name: string): string {
  const words = name.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

/** "Justin Jefferson" → "J. Jefferson"; D/ST names pass through. */
export function shortPlayerName(name: string): string {
  if (name.includes("D/ST")) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

export function formatPar(par: number): string {
  const rounded = Math.round(par);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

/* ---------------------------------------------------------------------------
   League shape
   --------------------------------------------------------------------------- */

/** Total draft rounds = roster slots + bench (sport-specific roster). */
export function getTotalRounds(league: League): number {
  if (league.sport === "football") {
    const roster = normalizeFootballConfig(league.football).roster;
    return (
      Object.values(roster.positions).reduce((total, n) => total + n, 0) +
      roster.bench
    );
  }
  const roster = league.leagueSettings.roster;
  return (
    Object.values(roster.positions).reduce((total, n) => total + n, 0) +
    roster.bench
  );
}

/* ---------------------------------------------------------------------------
   Player pool
   --------------------------------------------------------------------------- */

const searchTextFor = (name: string, team: string, pos: string) =>
  `${name} ${team} ${pos}`.toLowerCase();

/**
 * The full ranked pool (drafted + keepers included), sorted by projected
 * points descending. Sport-specific ranking engines feed one shape.
 */
export function buildRoomPlayers(
  league: League,
  group: ProjectionGroup | null,
  mergeTwoWayRankings: boolean,
): RoomPlayer[] {
  if (!group) return [];

  if (league.sport === "football") {
    const config = normalizeFootballConfig(league.football);
    const rows = buildFootballRankedPlayers({
      activeGroup: group,
      config,
      leagueSize: league.leagueSettings.leagueSize,
      draftState: league.draftState,
      playerStatOverrides: league.playerStatOverrides,
    });
    return sortFootballRankedPlayers(rows, "points", "desc").map((row) => ({
      id: row.player._id,
      name: row.player.Name,
      pos: row.player.Position,
      team: row.player.Team,
      bye: row.player.BYE,
      points: row.projectedPoints,
      par: row.par,
      isDrafted: row.isDrafted,
      isKeeper: row.isKeeper,
      kind: "football" as const,
      searchText: row.searchText,
    }));
  }

  const rows = buildBaseRankedPlayers({
    activeGroup: group,
    playerView: "all",
    scoringSettings: league.scoringSettings,
    leagueSettings: league.leagueSettings,
    draftState: league.draftState,
    mergeTwoWayRankings,
  });

  return [...rows]
    .sort((a, b) => b.projectedPoints - a.projectedPoints)
    .map((row) => {
      const eligibility = formatEligibilityForLeaderboard(row.player);
      const fallback =
        row.player._type === "batter"
          ? "BAT"
          : row.player._type === "pitcher"
            ? "PIT"
            : "2W";
      const pos = eligibility === "-" ? fallback : eligibility;
      return {
        id: row.player._id,
        name: row.player.Name,
        pos,
        team: row.player.Team,
        bye: null,
        points: row.projectedPoints,
        par: row.par,
        isDrafted: row.isDrafted,
        isKeeper: row.isKeeper,
        kind: row.player._type,
        searchText: searchTextFor(row.player.Name, row.player.Team, pos),
      };
    });
}

/* ---------------------------------------------------------------------------
   Tape
   --------------------------------------------------------------------------- */

export function buildTapeCells({
  leagueSize,
  totalRounds,
  format,
  history,
  reservedKeeperPicks,
  playersById,
  myTeamIndex,
  teamNames,
}: {
  leagueSize: number;
  totalRounds: number;
  format: DraftFormat;
  history: DraftPick[];
  reservedKeeperPicks: Map<number, ReservedKeeperPick>;
  playersById: Map<string, RoomPlayer>;
  myTeamIndex: number;
  teamNames: string[];
}): TapeCell[] {
  const historyBySlot = new Map(
    history.map((pick) => [pick.slotIndex ?? pick.overallPick - 1, pick]),
  );
  const totalPicks = leagueSize * totalRounds;
  const cells: TapeCell[] = [];

  for (let slotIndex = 0; slotIndex < totalPicks; slotIndex++) {
    const context = getDraftPickContext(leagueSize, slotIndex, format);
    const keeper = reservedKeeperPicks.get(slotIndex);
    const logged = historyBySlot.get(slotIndex);
    const teamIndex = keeper?.teamIndex ?? logged?.teamIndex ?? context.teamIndex;
    const playerId = keeper?.playerId ?? logged?.playerId ?? null;
    const playerName = playerId
      ? shortPlayerName(playersById.get(playerId)?.name ?? "unknown")
      : null;

    cells.push({
      slotIndex,
      overall: context.overallPick,
      round: context.round,
      pickInRound: context.pickInRound,
      teamIndex,
      teamAbbrev: abbrevTeamName(teamNames[teamIndex] ?? `Team ${teamIndex + 1}`),
      playerName,
      isKeeper: keeper !== undefined,
      isMine: teamIndex === myTeamIndex,
    });
  }

  return cells;
}
