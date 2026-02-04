"use client";

import {
  useMemo,
  useState,
  useCallback,
  useDeferredValue,
  memo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import { useStore } from "@/store";
import { calculatePlayerPoints } from "@/lib/calculatePoints";
import {
  resolveQualityStarts,
  resolveCompleteGames,
  resolveShutouts,
} from "@/lib/pitchingOutcomes";
import { isValidBaseballIp } from "@/lib/ipMath";
import type {
  Player,
  RankedPlayer,
  DraftState,
  ScoringSettings,
  ProjectionGroup,
} from "@/types";

type PlayerView = "all" | "batters" | "pitchers";
type DraftFilter = "all" | "available" | "drafted" | "keepers";

export function Leaderboard() {
  const {
    projectionGroups,
    activeProjectionGroupId,
    setActiveProjectionGroup,
    scoringSettings,
    draftState,
    isDraftMode,
    toggleDrafted,
    toggleKeeper,
    mergeTwoWayRankings,
  } = useStore();
  const currentGroupId =
    activeProjectionGroupId ?? projectionGroups[0]?.id ?? null;
  const deferredGroupId = useDeferredValue(currentGroupId);
  const isSwitchingGroups = deferredGroupId !== currentGroupId;
  const [globalFilter, setGlobalFilter] = useState("");
  const [playerView, setPlayerView] = useState<PlayerView>("all");
  const [draftFilter, setDraftFilter] = useState<DraftFilter>("available");
  return (
    <div className="flex flex-col">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search players..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-64 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />

        <select
          value={playerView}
          onChange={(e) => setPlayerView(e.target.value as PlayerView)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        >
          <option value="all">All Players</option>
          <option value="batters">Batters Only</option>
          <option value="pitchers">Pitchers Only</option>
        </select>

        {projectionGroups.length > 1 && (
          <div className="flex items-center gap-2">
            <select
              value={currentGroupId ?? ""}
              onChange={(e) => {
                const nextId = e.target.value;
                setActiveProjectionGroup(nextId);
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {projectionGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {isSwitchingGroups && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-600"
                aria-label="Loading projections"
              />
            )}
          </div>
        )}


        {isDraftMode && (
          <select
            value={draftFilter}
            onChange={(e) => setDraftFilter(e.target.value as DraftFilter)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="available">Available</option>
            <option value="all">All</option>
            <option value="drafted">Drafted</option>
            <option value="keepers">Keepers</option>
          </select>
        )}

        {isDraftMode && (
          <span className="text-xs text-zinc-400">
            Click to draft, right-click for keeper
          </span>
        )}
      </div>

      {/* Table */}
      <div className="relative">
        {isSwitchingGroups && (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-black/10 dark:bg-black/20" />
        )}
        <LeaderboardTable
          projectionGroups={projectionGroups}
          activeGroupId={deferredGroupId}
          scoringSettings={scoringSettings}
          draftState={draftState}
          isDraftMode={isDraftMode}
          mergeTwoWayRankings={mergeTwoWayRankings}
          toggleDrafted={toggleDrafted}
          toggleKeeper={toggleKeeper}
          playerView={playerView}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          draftFilter={draftFilter}
        />
      </div>
    </div>
  );
}

type LeaderboardTableProps = {
  projectionGroups: ProjectionGroup[];
  activeGroupId: string | null;
  scoringSettings: ScoringSettings;
  draftState: DraftState;
  isDraftMode: boolean;
  mergeTwoWayRankings: boolean;
  toggleDrafted: (playerId: string) => void;
  toggleKeeper: (playerId: string) => void;
  playerView: PlayerView;
  globalFilter: string;
  setGlobalFilter: Dispatch<SetStateAction<string>>;
  draftFilter: DraftFilter;
};

const LeaderboardTable = memo(function LeaderboardTable({
  projectionGroups,
  activeGroupId,
  scoringSettings,
  draftState,
  isDraftMode,
  mergeTwoWayRankings,
  toggleDrafted,
  toggleKeeper,
  playerView,
  globalFilter,
  setGlobalFilter,
  draftFilter,
}: LeaderboardTableProps) {
  const activeGroup =
    projectionGroups.find((group) => group.id === activeGroupId) ??
    projectionGroups[0] ??
    null;
  const batters = activeGroup?.batters ?? [];
  const pitchers = activeGroup?.pitchers ?? [];
  const twoWayPlayers = activeGroup?.twoWayPlayers ?? [];

  const [sorting, setSorting] = useState<SortingState>([
    { id: "projectedPoints", desc: true },
  ]);

  const canMergeTwoWay =
    !!activeGroup &&
    activeGroup.batterIdSource !== null &&
    activeGroup.batterIdSource !== "generated" &&
    activeGroup.pitcherIdSource !== null &&
    activeGroup.pitcherIdSource !== "generated";

  const twoWayIds = useMemo(
    () => new Set(twoWayPlayers.map((player) => player._id)),
    [twoWayPlayers]
  );

  const useBaseballIp = useMemo(() => {
    const pitcherIps = [
      ...pitchers,
      ...twoWayPlayers,
    ]
      .map((player) => {
        if (player._type === "two-way") {
          return player._pitchingStats.IP;
        }
        if (player._type === "pitcher") {
          return player.IP;
        }
        return null;
      })
      .filter((ip): ip is number => typeof ip === "number");

    if (pitcherIps.length === 0) return false;
    return pitcherIps.every((ip) => isValidBaseballIp(ip));
  }, [pitchers, twoWayPlayers]);

  // Create Sets for O(1) lookups instead of O(n) array.includes()
  const draftedIdsSet = useMemo(
    () => new Set(draftState.draftedIds),
    [draftState.draftedIds]
  );
  const keeperIdsSet = useMemo(
    () => new Set(draftState.keeperIds),
    [draftState.keeperIds]
  );

  // Memoize toggle handler to prevent column regeneration
  const handleToggleDrafted = useCallback(
    (playerId: string) => toggleDrafted(playerId),
    [toggleDrafted]
  );

  // Calculate points and create ranked players
  const rankedPlayers = useMemo(() => {
    let players: Player[] = [];
    const useMergedTwoWay =
      canMergeTwoWay && mergeTwoWayRankings && twoWayPlayers.length > 0;

    if (playerView === "all") {
      if (useMergedTwoWay) {
        players = [
          ...batters.filter((player) => !twoWayIds.has(player._id)),
          ...pitchers.filter((player) => !twoWayIds.has(player._id)),
          ...twoWayPlayers,
        ];
      } else if (batters.length === 0 && pitchers.length === 0 && twoWayPlayers.length > 0) {
        players = [...twoWayPlayers];
      } else {
        players = [...batters, ...pitchers];
      }
    } else if (playerView === "batters") {
      if (useMergedTwoWay) {
        players = [
          ...batters.filter((player) => !twoWayIds.has(player._id)),
          ...twoWayPlayers,
        ];
      } else if (batters.length === 0 && twoWayPlayers.length > 0) {
        players = [...twoWayPlayers];
      } else {
        players = [...batters];
      }
    } else {
      if (useMergedTwoWay) {
        players = [
          ...pitchers.filter((player) => !twoWayIds.has(player._id)),
          ...twoWayPlayers,
        ];
      } else if (pitchers.length === 0 && twoWayPlayers.length > 0) {
        players = [...twoWayPlayers];
      } else {
        players = [...pitchers];
      }
    }

    return players.map((player) => ({
      player,
      projectedPoints: calculatePlayerPoints(player, scoringSettings, playerView, useBaseballIp),
      isDrafted: draftedIdsSet.has(player._id),
      isKeeper: keeperIdsSet.has(player._id),
    }));
  }, [
    batters,
    pitchers,
    twoWayPlayers,
    scoringSettings,
    draftedIdsSet,
    keeperIdsSet,
    playerView,
    canMergeTwoWay,
    mergeTwoWayRankings,
    twoWayIds,
    useBaseballIp,
  ]);

  // Filter by draft status in draft mode
  const filteredPlayers = useMemo(() => {
    if (!isDraftMode || draftFilter === "all") return rankedPlayers;

    return rankedPlayers.filter((p) => {
      switch (draftFilter) {
        case "available":
          return !p.isDrafted && !p.isKeeper;
        case "drafted":
          return p.isDrafted;
        case "keepers":
          return p.isKeeper;
        default:
          return true;
      }
    });
  }, [rankedPlayers, isDraftMode, draftFilter]);

  const columns = useMemo<ColumnDef<RankedPlayer>[]>(() => {
    const baseColumns: ColumnDef<RankedPlayer>[] = [
      {
        id: "rank",
        header: "#",
        size: 50,
        cell: ({ row }) => (
          <span className="text-zinc-500">{row.index + 1}</span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "player.Name",
        header: "Name",
        size: 180,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {isDraftMode && (
              <input
                type="checkbox"
                checked={row.original.isDrafted || row.original.isKeeper}
                onChange={() => handleToggleDrafted(row.original.player._id)}
                className="h-4 w-4 rounded border-zinc-300"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span
              className={
                row.original.isDrafted
                  ? "text-zinc-400 line-through"
                  : row.original.isKeeper
                  ? "font-semibold text-amber-600"
                  : ""
              }
            >
              {row.original.player.Name}
            </span>
            {row.original.isKeeper && (
              <span className="rounded bg-amber-100 px-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                K
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "player.Team",
        header: "Team",
        size: 60,
      },
      {
        accessorKey: "player._type",
        header: "Type",
        size: 60,
        cell: ({ row }) => (
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              row.original.player._type === "batter"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : row.original.player._type === "pitcher"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}
          >
            {row.original.player._type === "batter"
              ? "BAT"
              : row.original.player._type === "pitcher"
              ? "PIT"
              : "2W"}
          </span>
        ),
      },
      {
        accessorKey: "projectedPoints",
        header: "Points",
        size: 80,
        cell: ({ row }) => (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {row.original.projectedPoints.toFixed(1)}
          </span>
        ),
      },
    ];

    // Add type-specific stat columns
    if (playerView === "batters" || playerView === "all") {
      const batterCols: ColumnDef<RankedPlayer>[] = [
        {
          id: "HR",
          header: "HR",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "batter"
              ? (row.player as unknown as Record<string, number>).HR
              : row.player._type === "two-way"
              ? row.player._battingStats.HR
              : null,
          cell: ({ getValue }) => getValue() ?? "-",
        },
        {
          id: "R",
          header: "R",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "batter"
              ? (row.player as unknown as Record<string, number>).R
              : row.player._type === "two-way"
              ? row.player._battingStats.R
              : null,
          cell: ({ getValue }) => getValue() ?? "-",
        },
        {
          id: "RBI",
          header: "RBI",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "batter"
              ? (row.player as unknown as Record<string, number>).RBI
              : row.player._type === "two-way"
              ? row.player._battingStats.RBI
              : null,
          cell: ({ getValue }) => getValue() ?? "-",
        },
        {
          id: "SB",
          header: "SB",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "batter"
              ? (row.player as unknown as Record<string, number>).SB
              : row.player._type === "two-way"
              ? row.player._battingStats.SB
              : null,
          cell: ({ getValue }) => getValue() ?? "-",
        },
        {
          id: "AVG",
          header: "AVG",
          size: 60,
          accessorFn: (row) =>
            row.player._type === "batter"
              ? (row.player as unknown as Record<string, number>).AVG
              : row.player._type === "two-way"
              ? row.player._battingStats.AVG
              : null,
          cell: ({ getValue }) => {
            const val = getValue() as number | null;
            return val ? val.toFixed(3).replace(/^0/, "") : "-";
          },
        },
      ];
      baseColumns.push(...batterCols);
    }

    if (playerView === "pitchers" || playerView === "all") {
      const pitcherCols: ColumnDef<RankedPlayer>[] = [
        {
          id: "W",
          header: "W",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "pitcher"
              ? (row.player as unknown as Record<string, number>).W
              : row.player._type === "two-way"
              ? row.player._pitchingStats.W
              : null,
          cell: ({ getValue }) => getValue() ?? "-",
        },
        {
          id: "QS",
          header: "QS",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "pitcher"
              ? resolveQualityStarts(row.player, useBaseballIp)
              : row.player._type === "two-way"
              ? resolveQualityStarts(row.player._pitchingStats, useBaseballIp)
              : null,
          cell: ({ getValue }) => {
            const val = getValue() as number | null;
            return val === null ? "-" : val.toFixed(1);
          },
        },
        {
          id: "CG",
          header: "CG",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "pitcher"
              ? resolveCompleteGames(row.player, useBaseballIp)
              : row.player._type === "two-way"
              ? resolveCompleteGames(row.player._pitchingStats, useBaseballIp)
              : null,
          cell: ({ getValue }) => {
            const val = getValue() as number | null;
            return val === null ? "-" : val.toFixed(1);
          },
        },
        {
          id: "ShO",
          header: "ShO",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "pitcher"
              ? resolveShutouts(row.player, useBaseballIp)
              : row.player._type === "two-way"
              ? resolveShutouts(row.player._pitchingStats, useBaseballIp)
              : null,
          cell: ({ getValue }) => {
            const val = getValue() as number | null;
            return val === null ? "-" : val.toFixed(1);
          },
        },
        {
          id: "SO_P",
          header: "K",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "pitcher"
              ? (row.player as unknown as Record<string, number>).SO
              : row.player._type === "two-way"
              ? row.player._pitchingStats.SO
              : null,
          cell: ({ getValue }) => getValue() ?? "-",
        },
        {
          id: "ERA",
          header: "ERA",
          size: 60,
          accessorFn: (row) =>
            row.player._type === "pitcher"
              ? (row.player as unknown as Record<string, number>).ERA
              : row.player._type === "two-way"
              ? row.player._pitchingStats.ERA
              : null,
          cell: ({ getValue }) => {
            const val = getValue() as number | null;
            return val ? val.toFixed(2) : "-";
          },
        },
        {
          id: "IP",
          header: "IP",
          size: 50,
          accessorFn: (row) =>
            row.player._type === "pitcher"
              ? (row.player as unknown as Record<string, number>).IP
              : row.player._type === "two-way"
              ? row.player._pitchingStats.IP
              : null,
          cell: ({ getValue }) => getValue() ?? "-",
        },
      ];
      baseColumns.push(...pitcherCols);
    }

    // ADP column
    baseColumns.push({
      id: "ADP",
      header: "ADP",
      size: 60,
      accessorFn: (row) => (row.player as unknown as Record<string, number | null>).ADP,
      cell: ({ getValue }) => {
        const val = getValue() as number | null;
        return val ? Math.round(val) : "-";
      },
    });

    return baseColumns;
  }, [playerView, isDraftMode, handleToggleDrafted, useBaseballIp]);

  const table = useReactTable({
    data: filteredPlayers,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _, filterValue) => {
      const name = row.original.player.Name.toLowerCase();
      const team = row.original.player.Team.toLowerCase();
      const search = filterValue.toLowerCase();
      return name.includes(search) || team.includes(search);
    },
  });

  const handleRowClick = useCallback(
    (player: RankedPlayer) => {
      if (!isDraftMode) return;
      handleToggleDrafted(player.player._id);
    },
    [isDraftMode, handleToggleDrafted]
  );

  const handleRowContextMenu = (e: React.MouseEvent, player: RankedPlayer) => {
    if (!isDraftMode) return;
    e.preventDefault();
    toggleKeeper(player.player._id);
  };

  if (!activeGroup || (batters.length === 0 && pitchers.length === 0 && twoWayPlayers.length === 0)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-zinc-500">
        <p className="mb-2 text-lg">No players loaded</p>
        <p className="text-sm">Upload a CSV file to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={`px-3 py-2 text-left text-xs font-semibold uppercase text-zinc-600 dark:text-zinc-400 ${
                    header.column.getCanSort()
                      ? "cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
                      : ""
                  }`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {{
                      asc: " ↑",
                      desc: " ↓",
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => handleRowClick(row.original)}
              onContextMenu={(e) => handleRowContextMenu(e, row.original)}
              className={`border-t border-zinc-100 dark:border-zinc-800 ${
                isDraftMode ? "cursor-pointer" : ""
              } ${
                row.original.isDrafted
                  ? "bg-zinc-50 dark:bg-zinc-800/50"
                  : row.original.isKeeper
                  ? "bg-amber-50 dark:bg-amber-900/10"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
